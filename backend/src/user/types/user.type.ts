import { Role } from '@/database/generated/prisma/enums';

export type UserCreateInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  password: string;
  role: Role;
  clinicId?: string;
};
