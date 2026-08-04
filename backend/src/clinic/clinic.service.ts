import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { ListClinicQueryDto } from './dto/list-clinic-query.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

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
}
