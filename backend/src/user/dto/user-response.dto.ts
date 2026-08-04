import { Role } from '@/database/generated/prisma/enums';

export class UserResponseDto {
  id: string;

  firstName: string;

  lastName: string;

  phone: string | null;

  email: string;

  avatarUrl: string | null;

  coverUrl: string | null;

  addressLine: string | null;

  subdistrict: string | null;

  district: string | null;

  province: string | null;

  postalCode: string | null;

  role: Role;

  clinicId: string | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
