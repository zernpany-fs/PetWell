import { IsPassword } from '../../common/decorators/is-password.decorator';
import { Trim } from '../../common/decorators/trim.decorator';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsOptional()
  @IsString()
  @Trim()
  phone?: string;

  @IsEmail()
  @IsNotEmpty()
  @Trim()
  email: string;

  // D63: any characters, 8+ characters, at most 72 bytes.
  @IsPassword()
  password: string;
}
