import { Trim } from '@/common/decorators/trim.decorator';
import { ClinicType } from '@/database/generated/prisma/enums';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListClinicQueryDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsEnum(ClinicType)
  type?: ClinicType;
}
