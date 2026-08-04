import { redirect } from 'next/navigation';
import { auth } from './auth';
import { Role } from './api/api.type';

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role === 'CLINIC_STAFF' ? '/staff/dashboard' : '/owner/dashboard');
  }
  return user;
}
