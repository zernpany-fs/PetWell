import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { AccessService } from '@/access/access.service';
import type { AccessLevel } from '@/access/access-level';
import { Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HealthRecordResponseDto } from './dto/health-record-response.dto';

const clinicInclude = {
  clinic: { select: { id: true, name: true, clinicType: true } },
};

// Access levels that let a clinic see the pet at all (NONE is a 404).
type ClinicPetAccess = Exclude<AccessLevel, { level: 'NONE' }>;

@Injectable()
export class HealthRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly accessService: AccessService,
  ) {}

  async create(
    petId: string,
    user: AccessTokenPayload,
    dto: CreateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    if (!user.clinicId) {
      throw new ForbiddenException('Clinic staff is not linked to a clinic');
    }
    const access = await this.requireClinicPetAccess(petId, user);
    // D19, D35: a new record needs an active grant.
    if (access.level !== 'FULL') {
      throw new ForbiddenException('No active access to this pet');
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
    if (user.role === Role.OWNER) {
      await this.ensureOwnerPet(petId, user.sub);
      return this.findActiveRecords({ petId });
    }

    const access = await this.requireClinicPetAccess(petId, user);
    // clinicId is not null here: a clinic-less user gets NONE (404) above.
    const clinicId = user.clinicId!;
    // D36: reading history is logged like opening the pet (D24, D34).
    await this.accessService.logAccess({
      userId: user.sub,
      clinicId,
      petId,
      grantId: access.level === 'FULL' ? access.grantId : null,
    });
    // D5: full history while access lasts. D6, D11: otherwise own records.
    return this.findActiveRecords(
      access.level === 'FULL' ? { petId } : { petId, clinicId },
    );
  }

  async findOne(
    recordId: string,
    user: AccessTokenPayload,
  ): Promise<HealthRecordResponseDto> {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: {
        ...clinicInclude,
        pet: { select: { ownerId: true, isActive: true } },
      },
    });
    // D37: an archived record is shown to no one.
    if (!record || !record.isActive) {
      throw new NotFoundException('Health record not found');
    }

    if (user.role === Role.OWNER) {
      if (record.pet.ownerId !== user.sub) {
        throw new NotFoundException('Health record not found');
      }
    } else {
      await this.checkClinicCanReadRecord(record, user);
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

  private findActiveRecords(where: {
    petId: string;
    clinicId?: string;
  }): Promise<HealthRecordResponseDto[]> {
    return this.prisma.healthRecord.findMany({
      where: { ...where, isActive: true },
      orderBy: { recordDate: 'desc' },
      include: clinicInclude,
    });
  }

  private async ensureOwnerPet(petId: string, ownerId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true, isActive: true },
    });
    if (!pet || !pet.isActive || pet.ownerId !== ownerId) {
      throw new NotFoundException('Pet not found');
    }
  }

  /**
   * The clinic's access to an active pet. NONE (or a missing or archived
   * pet) is a 404, the same as GET /pets/:petId (D20).
   */
  private async requireClinicPetAccess(
    petId: string,
    user: AccessTokenPayload,
  ): Promise<ClinicPetAccess> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { isActive: true },
    });
    if (!pet || !pet.isActive) {
      throw new NotFoundException('Pet not found');
    }
    const access = await this.accessService.getClinicAccess(
      user.clinicId,
      petId,
    );
    if (access.level === 'NONE') {
      throw new NotFoundException('Pet not found');
    }
    return access;
  }

  /**
   * D6: a clinic can always read its own records. Records of other clinics
   * need an active grant (D5). Otherwise 404, and nothing is logged (D32).
   */
  private async checkClinicCanReadRecord(
    record: { petId: string; clinicId: string; pet: { isActive: boolean } },
    user: AccessTokenPayload,
  ): Promise<void> {
    if (!record.pet.isActive) {
      throw new NotFoundException('Health record not found');
    }

    let grantId: string | null = null;
    if (record.clinicId !== user.clinicId) {
      const access = await this.accessService.getClinicAccess(
        user.clinicId,
        record.petId,
      );
      if (access.level !== 'FULL') {
        throw new NotFoundException('Health record not found');
      }
      grantId = access.grantId;
    }

    // D36. clinicId is not null here: a clinic-less user never matches
    // record.clinicId and gets NONE from getClinicAccess.
    await this.accessService.logAccess({
      userId: user.sub,
      clinicId: user.clinicId!,
      petId: record.petId,
      grantId,
    });
  }

  private async ensureRecordEditable(
    recordId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: recordId },
      select: { clinicId: true, isActive: true },
    });
    // D37: an archived record cannot be edited.
    if (!record || !record.isActive) {
      throw new NotFoundException('Health record not found');
    }
    // D19: a clinic can always edit its own records, with or without access.
    if (record.clinicId !== user.clinicId) {
      throw new ForbiddenException(
        'Only the clinic that created this record can edit it',
      );
    }
  }
}
