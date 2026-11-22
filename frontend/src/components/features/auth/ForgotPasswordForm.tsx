'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { MailCheck } from 'lucide-react';
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
} from '@/lib/schemas/auth.schema';
import { forgotPasswordAction } from '@/lib/actions/auth.action';
import { FormInput } from './FormInput';

/**
 * US-07 AC1 + D62: ask for an email, then always show the same message,
 * so the page never tells whether the email has an account (D57).
 */
export default function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
  });

  function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.success) setSentMessage(result.message ?? '');
      else setFormError(result.message);
    });
  }

  if (sentMessage !== null) {
    return (
      <div className="text-center" role="status">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#EEF3F8] text-[#5E86AD] flex items-center justify-center">
          <MailCheck size={22} />
        </div>
        <h2 className="text-[#2D2A26] mb-2" style={{ fontSize: '18px' }}>
          Check your inbox
        </h2>
        <p className="text-[#6E675C] mb-6" style={{ fontSize: '14px' }}>
          {sentMessage} The link works once and expires in 30 minutes.
        </p>
        <Link
          href="/login"
          className="pw-btn-primary w-full rounded-full flex items-center justify-center"
          style={{ minHeight: '44px' }}
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      {formError && (
        <p role="alert" className="text-[#C4534E]" style={{ fontSize: '13px' }}>
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="pw-btn-primary w-full rounded-full"
        style={{ minHeight: '44px' }}
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
      <div className="text-center" style={{ fontSize: '14px' }}>
        <Link
          href="/login"
          className="text-[#5E86AD] hover:text-[#40638A] no-underline"
        >
          ← Back to log in
        </Link>
      </div>
    </form>
  );
}
