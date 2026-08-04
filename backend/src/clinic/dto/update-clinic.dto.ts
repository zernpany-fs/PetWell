import { Trim } from '@/common/decorators/trim.decorator';
import { ClinicType } from '@/database/generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @Trim()
  name?: string;

  @IsOptional()
  @IsString()
  @Trim()
  address?: string;

  @IsOptional()
  @IsString()
  @Trim()
  phone?: string;

  @IsOptional()
  @IsString()
  @Trim()
  description?: string;

  @IsOptional()
  @IsEnum(ClinicType)
  clinicType?: ClinicType;

  @IsOptional()
  @IsString()
  @Trim()
  googleMapsLink?: string;
}
