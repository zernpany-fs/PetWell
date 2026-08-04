import { ClinicType } from '@/database/generated/prisma/enums';

export class ClinicResponseDto {
  id: string;

  name: string;

  address: string | null;

  phone: string | null;

  description: string | null;

  photoUrl: string | null;

  clinicType: ClinicType;

  googleMapsLink: string | null;

  isActive: boolean;

  createdAt: Date;
}
