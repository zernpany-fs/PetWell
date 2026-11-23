'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import {
  ResetPasswordInput,
  resetPasswordSchema,
} from '@/lib/schemas/auth.schema';
import { resetPasswordAction } from '@/lib/actions/auth.action';
import { FormInput } from './FormInput';

/**
 * US-07 AC3–AC4 + D62: choose a new password. The link is checked only
 * when the form is sent; a bad link shows one message and a way to ask
 * for a new one (D59).
 */
export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema),
  });

  function onSubmit(values: ResetPasswordInput) {
    setLinkError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(token, values);
      if (result.success) {
        toast.success(result.message ?? 'Password changed.');
        router.push('/login');
      } else {
        setLinkError(result.message);
      }
    });
  }

  const eye = (
    <button
      type="button"
      onClick={() => setShowPw((p) => !p)}
      className="text-pw-muted hover:text-pw-ink"
      aria-label={showPw ? 'Hide password' : 'Show password'}
    >
      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        label="New password"
        type={showPw ? 'text' : 'password'}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        right={eye}
        {...register('password')}
      />
      <FormInput
        label="Confirm new password"
        type={showPw ? 'text' : 'password'}
        placeholder="Type it again"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {linkError && (
        <div
          role="alert"
          className="rounded-xl px-3 py-2.5 border bg-pw-danger-tint border-pw-danger-line text-pw-danger"
          style={{ fontSize: '13px' }}
        >
          {linkError}{' '}
          <Link
            href="/forgot-password"
            className="underline underline-offset-2"
          >
            Get a new link
          </Link>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="pw-btn-primary w-full rounded-full"
        style={{ minHeight: '44px' }}
      >
        {pending ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}
