import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import {
  AppointmentStatus,
  Role,
} from '@/database/generated/prisma/enums';
import { PrismaClientKnownRequestError } from '@/database/generated/prisma/internal/prismaNamespace';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentStatusLogResponseDto } from './dto/appointment-status-log-response.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import {
  DayAvailabilityResponseDto,
  SlotAvailabilityDto,
} from './dto/slot-availability-response.dto';
import {
  businessHours,
  MAX_APPOINTMENTS_PER_SLOT,
  SEAT_CONSUMING_STATUSES,
  SLOT_FULL_MESSAGE,
  slotStartFor,
  toSlotEnd,
  toSlotStart,
} from './appointment.constants';

const WRITE_CONFLICT_CODE = 'P2034';

const appointmentInclude = {
  pet: { select: { id: true, name: true, species: true } },
  clinic: { select: { id: true, name: true, clinicType: true } },
};

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.REJECTED,
    AppointmentStatus.CANCELLED,
  ],
  CONFIRMED: [
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  RESCHEDULED: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.REJECTED,
    AppointmentStatus.CANCELLED,
  ],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

const OWNER_CANCELLABLE: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: dto.petId },
      select: { ownerId: true, isActive: true },
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
    if (pet.ownerId !== ownerId) {
      throw new ForbiddenException('This pet is not yours');
    }
    if (!pet.isActive) {
      throw new BadRequestException('Cannot book for an archived pet');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
      select: { id: true },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return this.createWithinCapacity(dto);
  }

  private async createWithinCapacity(
    dto: CreateAppointmentDto,
    isRetry = false,
  ): Promise<AppointmentResponseDto> {
    const slotStart = toSlotStart(dto.appointmentDate);
    const slotEnd = toSlotEnd(slotStart);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const booked = await tx.appointment.count({
            where: {
              clinicId: dto.clinicId,
              status: { in: SEAT_CONSUMING_STATUSES },
              appointmentDate: { gte: slotStart, lt: slotEnd },
            },
          });
          if (booked >= MAX_APPOINTMENTS_PER_SLOT) {
            throw new ConflictException(SLOT_FULL_MESSAGE);
          }

          return tx.appointment.create({
            data: {
              petId: dto.petId,
              clinicId: dto.clinicId,
              appointmentDate: dto.appointmentDate,
              notes: dto.notes,
            },
            include: appointmentInclude,
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === WRITE_CONFLICT_CODE
      ) {
        if (!isRetry) {
          return this.createWithinCapacity(dto, true);
        }
        throw new ConflictException(
          'That time slot is being booked by someone else. Please try again.',
        );
      }
      throw error;
    }
  }

  async getDayAvailability(
    clinicId: string,
    query: AvailabilityQueryDto,
  ): Promise<DayAvailabilityResponseDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const hours = businessHours();
    const dayStart = slotStartFor(query.date, hours[0]);
    const dayEnd = toSlotEnd(slotStartFor(query.date, hours[hours.length - 1]));

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: { in: SEAT_CONSUMING_STATUSES },
        appointmentDate: { gte: dayStart, lt: dayEnd },
      },
      select: { appointmentDate: true },
    });

    const bookedBySlot = new Map<number, number>();
    for (const { appointmentDate } of appointments) {
      const key = toSlotStart(appointmentDate).getTime();
      bookedBySlot.set(key, (bookedBySlot.get(key) ?? 0) + 1);
    }

    const now = Date.now();
    const slots: SlotAvailabilityDto[] = hours.map((hour) => {
      const slotStart = slotStartFor(query.date, hour);
      const booked = bookedBySlot.get(slotStart.getTime()) ?? 0;
      return {
        slotStart,
        hour,
        booked,
        remaining: Math.max(MAX_APPOINTMENTS_PER_SLOT - booked, 0),
        isFull: booked >= MAX_APPOINTMENTS_PER_SLOT,
        isPast: slotStart.getTime() <= now,
      };
    });

    return {
      clinicId,
      date: query.date,
      capacityPerSlot: MAX_APPOINTMENTS_PER_SLOT,
      slots,
    };
  }

  listByOwner(ownerId: string): Promise<AppointmentResponseDto[]> {
    return this.prisma.appointment.findMany({
      where: { pet: { ownerId } },
      include: appointmentInclude,
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async listByClinic(
    clinicId: string,
    user: AccessTokenPayload,
  ): Promise<AppointmentResponseDto[]> {
    if (user.clinicId !== clinicId) {
      throw new ForbiddenException('You can only view your own clinic');
    }
    return this.prisma.appointment.findMany({
      where: { clinicId },
      include: appointmentInclude,
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findOne(
    appointmentId: string,
    user: AccessTokenPayload,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        pet: { select: { id: true, name: true, species: true, ownerId: true } },
        clinic: { select: { id: true, name: true, clinicType: true } },
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanView(appointment.pet.ownerId, appointment.clinicId, user);
    return appointment;
  }

  async updateStatus(
    appointmentId: string,
    user: AccessTokenPayload,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { clinicId: true, status: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.clinicId !== user.clinicId) {
      throw new ForbiddenException('You can only manage your clinic appointments');
    }
    this.assertTransitionAllowed(appointment.status, dto.status);

    const [updated] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: dto.status },
        include: appointmentInclude,
      }),
      this.prisma.appointmentStatusLog.create({
        data: {
          appointmentId,
          changedById: user.sub,
          oldStatus: appointment.status,
          newStatus: dto.status,
          reason: dto.reason,
        },
      }),
    ]);
    return updated;
  }

  async cancel(
    appointmentId: string,
    user: AccessTokenPayload,
  ): Promise<MessageResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { status: true, pet: { select: { ownerId: true } } },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.pet.ownerId !== user.sub) {
      throw new ForbiddenException('This appointment is not yours');
    }
    if (!OWNER_CANCELLABLE.includes(appointment.status)) {
      throw new BadRequestException(
        `A ${appointment.status.toLowerCase()} appointment can no longer be cancelled`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED },
      }),
      this.prisma.appointmentStatusLog.create({
        data: {
          appointmentId,
          changedById: user.sub,
          oldStatus: appointment.status,
          newStatus: AppointmentStatus.CANCELLED,
          reason: 'Cancelled by owner',
        },
      }),
    ]);
    return { message: 'Appointment cancelled' };
  }

  async getLogs(
    appointmentId: string,
    user: AccessTokenPayload,
  ): Promise<AppointmentStatusLogResponseDto[]> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { clinicId: true, pet: { select: { ownerId: true } } },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanView(appointment.pet.ownerId, appointment.clinicId, user);

    return this.prisma.appointmentStatusLog.findMany({
      where: { appointmentId },
      include: {
        changedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { changedAt: 'asc' },
    });
  }

  private assertTransitionAllowed(
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): void {
    if (from === to) {
      throw new BadRequestException(
        `Appointment is already ${to.toLowerCase()}`,
      );
    }
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(
        `Cannot change a ${from.toLowerCase()} appointment to ${to.toLowerCase()}`,
      );
    }
  }

  private assertCanView(
    petOwnerId: string,
    appointmentClinicId: string,
    user: AccessTokenPayload,
  ): void {
    if (user.role === Role.OWNER && petOwnerId !== user.sub) {
      throw new NotFoundException('Appointment not found');
    }
    if (
      user.role === Role.CLINIC_STAFF &&
      appointmentClinicId !== user.clinicId
    ) {
      throw new NotFoundException('Appointment not found');
    }
  }
}
