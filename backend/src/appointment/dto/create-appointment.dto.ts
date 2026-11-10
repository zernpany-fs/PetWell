import { Trim } from '@/common/decorators/trim.decorator';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MinDate } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  petId: string;

  @IsUUID()
  clinicId: string;

  @MinDate(() => new Date(), {
    message: 'appointmentDate must be in the future',
  })
  @Type(() => Date)
  @IsDate()
  appointmentDate: Date;

  @IsOptional()
  @IsString()
  @Trim()
  notes?: string;
}
