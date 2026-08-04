import { Trim } from '@/common/decorators/trim.decorator';
import { TrimToNull } from '@/common/decorators/trim-to-null.decorator';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Trim()
  firstName?: string;

  @IsOptional()
  @IsString()
  @Trim()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Trim()
  phone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  @TrimToNull()
  addressLine?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  @TrimToNull()
  subdistrict?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  @TrimToNull()
  district?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  @TrimToNull()
  province?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{5}$/, { message: 'postalCode must be 5 digits' })
  @TrimToNull()
  postalCode?: string | null;
}
