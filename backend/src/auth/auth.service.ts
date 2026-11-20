import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { Role } from '@/database/generated/prisma/enums';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterClinicStaffDto } from './dto/register-clinic-staff.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AccessTokenService } from './access-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly bcryptService: BcryptService,
    private readonly accessTokenService: AccessTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    await this.userService.createUser({ ...dto, role: Role.OWNER });
  }

  async registerClinicStaff(dto: RegisterClinicStaffDto): Promise<void> {
    await this.userService.createUser({ ...dto, role: Role.CLINIC_STAFF });
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userService.getUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.bcryptService.compare(
      dto.password,
      user.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const access_token = await this.accessTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    });

    const { password, ...rest } = user;
    return { access_token, user: rest };
  }

  async getMe(id: string): Promise<UserResponseDto> {
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
