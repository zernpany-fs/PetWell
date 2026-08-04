import { Trim } from '@/common/decorators/trim.decorator';
import { RecordType } from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHealthRecordDto {
  @IsEnum(RecordType)
  recordType: RecordType;

  @IsString()
  @IsNotEmpty()
  @Trim()
  description: string;

  @Type(() => Date)
  @IsDate()
  recordDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextDueDate?: Date;
}
