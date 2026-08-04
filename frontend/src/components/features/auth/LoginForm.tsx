'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { LoginInput, loginSchema } from '@/lib/schemas/auth.schema';
import { loginAction } from '@/lib/actions/auth.action';
import { FormInput } from './FormInput';

export default function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: standardSchemaResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result && !result.success) setFormError(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormInput
        label="Password"
        type={showPw ? 'text' : 'password'}
        placeholder="••••••••"
        error={errors.password?.message}
        right={
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="text-[#6E675C] hover:text-[#2D2A26]"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        {...register('password')}
      />

      {formError && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 border"
          style={{
            backgroundColor: '#FEF2F2',
            borderColor: '#FECACA',
            color: '#C4534E',
            fontSize: '13px',
          }}
        >
          <XCircle size={15} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="pw-btn-primary w-full rounded-full flex items-center justify-center gap-2"
        style={{ minHeight: '44px' }}
      >
        {pending ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          'Log In'
        )}
      </button>
    </form>
  );
}
