import { Trim } from '@/common/decorators/trim.decorator';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  species: string;

  @IsOptional()
  @IsString()
  @Trim()
  breed?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @Trim()
  chronicCondition?: string;

  @IsOptional()
  @IsString()
  @Trim()
  drugAllergy?: string;

  @IsOptional()
  @IsString()
  @Trim()
  microchipNo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  latestWeight?: number;
}
