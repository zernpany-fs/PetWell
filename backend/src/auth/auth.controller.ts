import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterClinicStaffDto } from './dto/register-clinic-staff.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get('me')
  getMe(@CurrentUser('sub') id: string): Promise<UserResponseDto> {
    return this.authService.getMe(id);
  }
}
