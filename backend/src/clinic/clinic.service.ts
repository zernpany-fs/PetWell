import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, StaffStatus } from '../database/generated/prisma/enums';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import {
  StaffDecision,
  StaffRequestResponseDto,
} from './dto/staff-request.dto';
import { CloudinaryService } from '../infrastructure/upload/cloudinary.service';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { ListClinicQueryDto } from './dto/list-clinic-query.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  list(query: ListClinicQueryDto): Promise<ClinicResponseDto[]> {
    return this.prisma.clinic.findMany({
      where: {
        isActive: true,
        ...(query.type ? { clinicType: query.type } : {}),
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(clinicId: string): Promise<ClinicResponseDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    return clinic;
  }

  async update(
    clinicId: string,
    user: AccessTokenPayload,
    dto: UpdateClinicDto,
  ): Promise<ClinicResponseDto> {
    if (user.clinicId !== clinicId) {
      throw new ForbiddenException('You can only edit your own clinic');
    }
    await this.findOne(clinicId);
    return this.prisma.clinic.update({ where: { id: clinicId }, data: dto });
  }

  // US-08 (D64): any staff of the clinic may set its photo; a new upload
  // replaces the old one. Checked before uploading, so a refused request
  // never stores a file on Cloudinary.
  async uploadPhoto(
    clinicId: string,
    user: AccessTokenPayload,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (user.clinicId !== clinicId) {
      throw new ForbiddenException('You can only edit your own clinic');
    }
    await this.findOne(clinicId);
    const url = await this.cloudinaryService.upload(file);
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { photoUrl: url },
    });
    return { url };
  }

  // US-09 AC3 (D72, D76): pending staff sign-ups of the caller's clinic.
  // Only approved staff can call this: anyone else cannot log in (D74).
  async listStaffRequests(
    user: AccessTokenPayload,
  ): Promise<StaffRequestResponseDto[]> {
    const clinicId = this.ownClinic(user);
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: Role.CLINIC_STAFF,
        staffStatus: StaffStatus.PENDING,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // US-09 AC4–AC6 (D75, D76): compare-and-set on PENDING, like D31, so two
  // staff deciding at once cannot both win; nothing is written on 404/409.
  async decideStaffRequest(
    user: AccessTokenPayload,
    userId: string,
    decision: StaffDecision,
  ): Promise<MessageResponseDto> {
    const clinicId = this.ownClinic(user);
    const approve = decision === 'APPROVE';
    const { count } = await this.prisma.user.updateMany({
      where: {
        id: userId,
        clinicId,
        role: Role.CLINIC_STAFF,
        staffStatus: StaffStatus.PENDING,
      },
      data: {
        staffStatus: approve ? StaffStatus.APPROVED : StaffStatus.REJECTED,
        staffDecidedById: user.sub,
        staffDecidedAt: new Date(),
      },
    });
    if (count === 1) {
      return { message: approve ? 'Staff approved' : 'Staff rejected' };
    }
    const exists = await this.prisma.user.findFirst({
      where: { id: userId, clinicId, role: Role.CLINIC_STAFF },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Staff request not found');
    }
    throw new ConflictException('This request has already been decided');
  }

  private ownClinic(user: AccessTokenPayload): string {
    if (!user.clinicId) {
      throw new ForbiddenException('Your account is not linked to a clinic');
    }
    return user.clinicId;
  }
}
