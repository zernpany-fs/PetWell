import Link from 'next/link';
import { Metadata } from 'next';
import ResetPasswordForm from '@/components/features/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div
      className="w-full bg-white border border-pw-line rounded-[20px] shadow-[0_2px_8px_rgba(45,42,38,0.06)] p-8"
      style={{ maxWidth: '420px' }}
    >
      <h1
        className="font-display text-pw-ink mb-2"
        style={{ fontSize: '28px' }}
      >
        Choose a new password
      </h1>

      {token ? (
        <>
          <p className="text-pw-muted mb-6" style={{ fontSize: '14px' }}>
            After this you can log in with the new password.
          </p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="text-pw-muted" style={{ fontSize: '14px' }}>
          This page needs the link from the reset email.{' '}
          <Link
            href="/forgot-password"
            className="text-pw-primary hover:text-pw-primary-strong"
          >
            Ask for a new link
          </Link>
          .
        </p>
      )}
    </div>
  );
}
