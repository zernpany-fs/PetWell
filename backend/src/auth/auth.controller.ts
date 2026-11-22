import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterClinicStaffDto } from './dto/register-clinic-staff.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetService } from './password-reset.service';
import { FORGOT_PASSWORD_MESSAGE } from './password-reset';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<MessageResponseDto> {
    await this.authService.register(dto);
    return { message: 'Registered successfully' };
  }

  @Public()
  @Post('register/clinic-staff')
  async registerClinicStaff(
    @Body() dto: RegisterClinicStaffDto,
  ): Promise<MessageResponseDto> {
    await this.authService.registerClinicStaff(dto);
    return { message: 'Registered successfully' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  // US-07 AC1, D57: same answer whether or not the email has an account.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.passwordResetService.requestReset(dto.email);
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  // US-07 AC3, AC4 (D59)
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.passwordResetService.resetPassword(dto.token, dto.password);
    return { message: 'Password changed. You can log in now.' };
  }

  @Get('me')
  getMe(@CurrentUser('sub') id: string): Promise<UserResponseDto> {
    return this.authService.getMe(id);
  }
}
