import { Trim } from '@/common/decorators/trim.decorator';
import { RecordType } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateHealthRecordDto {
  @IsOptional()
  @IsEnum(RecordType)
  recordType?: RecordType;

  @IsOptional()
  @IsString()
  @Trim()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextDueDate?: Date;
}
