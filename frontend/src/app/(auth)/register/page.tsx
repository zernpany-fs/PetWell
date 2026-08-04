import Link from 'next/link';
import { Metadata } from 'next';
import RegisterForm from '@/components/features/auth/RegisterForm';
import { ClinicApi } from '@/lib/api/clinic.api';
import { Clinic } from '@/lib/api/api.type';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  let clinics: Clinic[] = [];
  try {
    clinics = await ClinicApi.list();
  } catch {
    clinics = [];
  }

  return (
    <div
      className="w-full bg-white border border-[#E6DFD3] rounded-[20px] shadow-[0_2px_8px_rgba(45,42,38,0.06)] p-8"
      style={{ maxWidth: '440px' }}
    >
      <h1 className="font-display text-[#2D2A26] mb-6" style={{ fontSize: '28px' }}>
        Create your account
      </h1>

      <RegisterForm clinics={clinics} />

      <div className="mt-4 text-center" style={{ fontSize: '14px' }}>
        <span className="text-[#6E675C]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#5E86AD] hover:text-[#40638A] no-underline">
            Log in
          </Link>
        </span>
      </div>
    </div>
  );
}
