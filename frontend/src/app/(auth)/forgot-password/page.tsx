import { Metadata } from 'next';
import ForgotPasswordForm from '@/components/features/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <div
      className="w-full bg-white border border-pw-line rounded-[20px] shadow-[0_2px_8px_rgba(45,42,38,0.06)] p-8"
      style={{ maxWidth: '420px' }}
    >
      <h1
        className="font-display text-pw-ink mb-2"
        style={{ fontSize: '28px' }}
      >
        Forgot password
      </h1>
      <p className="text-pw-muted mb-6" style={{ fontSize: '14px' }}>
        Enter your email and we&apos;ll send you a link to choose a new
        password.
      </p>

      <ForgotPasswordForm />
    </div>
  );
}
