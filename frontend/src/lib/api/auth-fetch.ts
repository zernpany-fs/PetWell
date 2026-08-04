import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { apiFetch, ApiFetchOptions } from './api-fetch';

export async function authFetch<T>(
  path: string,
  options: Omit<ApiFetchOptions, 'token'> = {},
): Promise<T> {
  const session = await auth();
  const token = session?.user?.access_token;
  if (!token) redirect('/login');
  return apiFetch<T>(path, { ...options, token });
}
