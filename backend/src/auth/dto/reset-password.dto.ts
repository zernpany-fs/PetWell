import {
  IsAlphanumeric,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  // D59: same rule as RegisterDto.
  @MinLength(6)
  @IsAlphanumeric()
  @IsString()
  @IsNotEmpty()
  password: string;
}
