import Link from 'next/link';
import { Metadata } from 'next';
import LoginForm from '@/components/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div
      className="w-full bg-white border border-pw-line rounded-[20px] shadow-[0_2px_8px_rgba(45,42,38,0.06)] p-8"
      style={{ maxWidth: '420px' }}
    >
      <h1
        className="font-display text-pw-ink mb-6"
        style={{ fontSize: '28px' }}
      >
        Welcome back
      </h1>

      <LoginForm />

      <div
        className="mt-4 flex flex-col items-center gap-2"
        style={{ fontSize: '14px' }}
      >
        <Link
          href="/forgot-password"
          className="text-pw-primary hover:text-pw-primary-strong no-underline"
        >
          Forgot password?
        </Link>
        <span className="text-pw-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-pw-primary hover:text-pw-primary-strong no-underline"
          >
            Register
          </Link>
        </span>
      </div>
    </div>
  );
}
