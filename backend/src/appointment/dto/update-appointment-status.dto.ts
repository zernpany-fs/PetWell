import { Trim } from '@/common/decorators/trim.decorator';
import { AppointmentStatus } from '@/database/generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @IsOptional()
  @IsString()
  @Trim()
  reason?: string;
}
