import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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
}
