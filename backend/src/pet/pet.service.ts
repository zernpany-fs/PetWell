import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { AppointmentStatus, Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetResponseDto } from './dto/pet-response.dto';
import { PetSearchResultDto } from './dto/pet-search-result.dto';
import { SearchPetQueryDto } from './dto/search-pet-query.dto';
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

  async findOne(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || !pet.isActive) {
      throw new NotFoundException('Pet not found');
    }
    if (user.role === Role.OWNER && pet.ownerId !== user.sub) {
      throw new NotFoundException('Pet not found');
    }
    return pet;
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

    const liveAppointments = await this.prisma.appointment.findMany({
      where: { petId, status: { in: CANCEL_ON_ARCHIVE } },
      select: { id: true, status: true },
    });

    await this.prisma.$transaction([
      this.prisma.pet.update({
        where: { id: petId },
        data: { isActive: false },
      }),
      ...liveAppointments.flatMap((appointment) => [
        this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.CANCELLED },
        }),
        this.prisma.appointmentStatusLog.create({
          data: {
            appointmentId: appointment.id,
            changedById: ownerId,
            oldStatus: appointment.status,
            newStatus: AppointmentStatus.CANCELLED,
            reason: 'Pet archived by owner',
          },
        }),
      ]),
    ]);

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
