import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { Role } from '@/database/generated/prisma/enums';
import { User } from '@/database/generated/prisma/client';
import { PrismaClientKnownRequestError } from '@/database/generated/prisma/internal/prismaNamespace';
import { UserCreateInput } from './types/user.type';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createUser(input: UserCreateInput): Promise<void> {
    if (input.role === Role.CLINIC_STAFF) {
      if (!input.clinicId) {
        throw new BadRequestException('clinicId is required for clinic staff');
      }
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: input.clinicId },
      });
      if (!clinic) {
        throw new BadRequestException('Selected clinic does not exist');
      }
    }

    const password = await this.bcryptService.hash(input.password);

    try {
      await this.prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email.toLowerCase(),
          password,
          role: input.role,
          clinicId: input.role === Role.CLINIC_STAFF ? input.clinicId : null,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  getUserById(id: string): Promise<UserResponseDto | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      omit: { password: true },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const avatarUrl = await this.cloudinaryService.upload(file);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return avatarUrl;
  }

  async uploadCover(userId: string, file: Express.Multer.File): Promise<string> {
    const coverUrl = await this.cloudinaryService.upload(file);
    await this.prisma.user.update({
      where: { id: userId },
      data: { coverUrl },
    });
    return coverUrl;
  }
}
