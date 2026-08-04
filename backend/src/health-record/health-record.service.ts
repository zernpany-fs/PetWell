import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HealthRecordResponseDto } from './dto/health-record-response.dto';

const clinicInclude = {
  clinic: { select: { id: true, name: true, clinicType: true } },
};

@Injectable()
export class HealthRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    petId: string,
    user: AccessTokenPayload,
    dto: CreateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    if (!user.clinicId) {
      throw new ForbiddenException('Clinic staff is not linked to a clinic');
    }
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { isActive: true },
    });
    if (!pet || !pet.isActive) {
      throw new NotFoundException('Pet not found');
    }

    return this.prisma.healthRecord.create({
      data: {
        petId,
        clinicId: user.clinicId,
        createdById: user.sub,
        recordType: dto.recordType,
        description: dto.description,
        recordDate: dto.recordDate,
        nextDueDate: dto.nextDueDate,
      },
      include: clinicInclude,
    });
  }

  async listByPet(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<HealthRecordResponseDto[]> {
    await this.ensurePetVisible(petId, user);
    return this.prisma.healthRecord.findMany({
      where: { petId, isActive: true },
      orderBy: { recordDate: 'desc' },
      include: clinicInclude,
    });
  }

  async findOne(
    recordId: string,
    user: AccessTokenPayload,
  ): Promise<HealthRecordResponseDto> {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { ...clinicInclude, pet: { select: { ownerId: true } } },
    });
    if (!record) {
      throw new NotFoundException('Health record not found');
    }
    if (user.role === Role.OWNER && record.pet.ownerId !== user.sub) {
      throw new NotFoundException('Health record not found');
    }
    const { pet, ...rest } = record;
    return rest;
  }

  async update(
    recordId: string,
    user: AccessTokenPayload,
    dto: UpdateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    await this.ensureRecordEditable(recordId, user);
    return this.prisma.healthRecord.update({
      where: { id: recordId },
      data: dto,
      include: clinicInclude,
    });
  }

  async uploadAttachment(
    recordId: string,
    user: AccessTokenPayload,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    await this.ensureRecordEditable(recordId, user);
    const url = await this.cloudinaryService.upload(file);
    await this.prisma.healthRecord.update({
      where: { id: recordId },
      data: { attachments: { push: url } },
    });
    return { url };
  }

  async archive(
    recordId: string,
    user: AccessTokenPayload,
  ): Promise<MessageResponseDto> {
    await this.ensureRecordEditable(recordId, user);
    await this.prisma.healthRecord.update({
      where: { id: recordId },
      data: { isActive: false },
    });
    return { message: 'Health record archived' };
  }

  private async ensurePetVisible(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true, isActive: true },
    });
    if (!pet || !pet.isActive) {
      throw new NotFoundException('Pet not found');
    }
    if (user.role === Role.OWNER && pet.ownerId !== user.sub) {
      throw new NotFoundException('Pet not found');
    }
  }

  private async ensureRecordEditable(
    recordId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: recordId },
      select: { clinicId: true },
    });
    if (!record) {
      throw new NotFoundException('Health record not found');
    }
    if (record.clinicId !== user.clinicId) {
      throw new ForbiddenException(
        'Only the clinic that created this record can edit it',
      );
    }
  }
}
