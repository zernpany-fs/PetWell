import { IsNotEmpty, IsString } from 'class-validator';
import { IsPassword } from '../../common/decorators/is-password.decorator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  // D63 (via D59): same rule as RegisterDto.
  @IsPassword()
  password: string;
}
