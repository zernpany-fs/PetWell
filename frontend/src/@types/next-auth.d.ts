import 'next-auth';
import 'next-auth/jwt';
import { Role } from '@/lib/api/api.type';

declare module 'next-auth' {
  interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    role?: Role;
    clinicId?: string | null;
    avatarUrl?: string | null;
    access_token?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    role?: Role;
    clinicId?: string | null;
    avatarUrl?: string | null;
    access_token?: string;
  }
}
