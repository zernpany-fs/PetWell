import { SetMetadata } from '@nestjs/common';
import { Role } from '../../database/generated/prisma/enums';

export const ROLES_KEY = 'ROLES';

export function Roles(...roles: Role[]) {
  return SetMetadata(ROLES_KEY, roles);
}
