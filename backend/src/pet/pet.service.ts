import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { AppointmentService } from '@/appointment/appointment.service';
import { AccessService } from '@/access/access.service';
import { AppointmentStatus, Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetResponseDto } from './dto/pet-response.dto';
import { PetSearchResultDto } from './dto/pet-search-result.dto';
import { SearchPetQueryDto } from './dto/search-pet-query.dto';
import { ClinicPetResponseDto } from './dto/clinic-pet-response.dto';
import { MessageResponseDto } from '@/common/dto/message-response.dto';

const SEARCH_RESULT_LIMIT = 50;

const CANCEL_ON_ARCHIVE = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

@Injectable()
export class PetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly appointmentService: AppointmentService,
    private readonly accessService: AccessService,
  ) {}

  create(ownerId: string, dto: CreatePetDto): Promise<PetResponseDto> {
    return this.prisma.pet.create({
      data: { ...dto, ownerId },
    });
  }

  listByOwner(ownerId: string): Promise<PetResponseDto[]> {
    return this.prisma.pet.findMany({
      where: { ownerId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  search(query: SearchPetQueryDto): Promise<PetSearchResultDto[]> {
    const term = query.q?.trim();
    if (!term) {
      return Promise.resolve([]);
    }

    const like = { contains: term, mode: 'insensitive' as const };

    return this.prisma.pet.findMany({
      where: {
        isActive: true,
        OR: [
          { name: like },
          { microchipNo: like },
          { owner: { firstName: like } },
          { owner: { lastName: like } },
          { owner: { email: like } },
          { owner: { phone: like } },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: SEARCH_RESULT_LIMIT,
    });
  }

  findOne(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<PetResponseDto | ClinicPetResponseDto> {
    return user.role === Role.OWNER
      ? this.findOneForOwner(petId, user.sub)
      : this.findOneForClinic(petId, user);
  }

  private async findOneForOwner(
    petId: string,
    ownerId: string,
  ): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || !pet.isActive || pet.ownerId !== ownerId) {
      throw new NotFoundException('Pet not found');
    }
    return pet;
  }

  /**
   * Clinic view depends on its access level (D20):
   * FULL = whole pet + owner contact, AUTHORED_ONLY = id/name/species,
   * NONE = same 404 as a missing pet, so a clinic cannot tell them apart.
   */
  private async findOneForClinic(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<ClinicPetResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
      },
    });
    if (!pet || !pet.isActive) {
      throw new NotFoundException('Pet not found');
    }

    const access = await this.accessService.getClinicAccess(
      user.clinicId,
      petId,
    );
    // D32: a denied view is not logged.
    if (access.level === 'NONE') {
      throw new NotFoundException('Pet not found');
    }

    // D34: if the log write fails, the request fails and no data is sent.
    await this.accessService.logAccess({
      userId: user.sub,
      clinicId: user.clinicId!, // not null: NONE is returned when it is
      petId,
      grantId: access.level === 'FULL' ? access.grantId : null,
    });

    if (access.level === 'FULL') {
      return { ...pet, accessLevel: 'FULL' };
    }
    return {
      accessLevel: 'AUTHORED_ONLY',
      id: pet.id,
      name: pet.name,
      species: pet.species,
    };
  }

  async update(
    petId: string,
    ownerId: string,
    dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    await this.ensureOwnership(petId, ownerId);
    return this.prisma.pet.update({ where: { id: petId }, data: dto });
  }

  async uploadPhoto(
    petId: string,
    ownerId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    await this.ensureOwnership(petId, ownerId);
    const url = await this.cloudinaryService.upload(file);
    await this.prisma.pet.update({
      where: { id: petId },
      data: { photoUrl: url },
    });
    return { url };
  }

  async archive(petId: string, ownerId: string): Promise<MessageResponseDto> {
    await this.ensureOwnership(petId, ownerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.pet.update({
        where: { id: petId },
        data: { isActive: false },
      });

      const liveAppointments = await tx.appointment.findMany({
        where: { petId, status: { in: CANCEL_ON_ARCHIVE } },
        select: { id: true, petId: true, clinicId: true, status: true },
      });

      // One at a time: a transaction runs its queries in order.
      // Cancelling also ends each appointment's grant (US-02 AC4).
      for (const appointment of liveAppointments) {
        await this.appointmentService.changeStatusInTransaction(
          tx,
          appointment,
          AppointmentStatus.CANCELLED,
          ownerId,
          'Pet archived by owner',
        );
      }
    });

    return { message: 'Pet archived' };
  }

  private async ensureOwnership(petId: string, ownerId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true },
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
    if (pet.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this pet');
    }
  }
}
