import Link from 'next/link';
import { Metadata } from 'next';
import LoginForm from '@/components/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div
      className="w-full bg-white border border-[#E6DFD3] rounded-[20px] shadow-[0_2px_8px_rgba(45,42,38,0.06)] p-8"
      style={{ maxWidth: '420px' }}
    >
      <h1 className="font-display text-[#2D2A26] mb-6" style={{ fontSize: '28px' }}>
        Welcome back
      </h1>

      <LoginForm />

      <div className="mt-4 flex flex-col items-center gap-2" style={{ fontSize: '14px' }}>
        <span className="text-[#6E675C]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#5E86AD] hover:text-[#40638A] no-underline">
            Register
          </Link>
        </span>
      </div>
    </div>
  );
}
