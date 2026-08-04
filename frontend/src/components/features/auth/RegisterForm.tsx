'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RegisterInput, registerSchema } from '@/lib/schemas/auth.schema';
import {
  registerAction,
  registerClinicStaffAction,
} from '@/lib/actions/auth.action';
import { Clinic, Role } from '@/lib/api/api.type';
import { FormInput } from './FormInput';

export default function RegisterForm({ clinics }: { clinics: Clinic[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>('OWNER');
  const [clinicId, setClinicId] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: standardSchemaResolver(registerSchema) });

  function onSubmit(values: RegisterInput) {
    setFormError(null);
    if (role === 'CLINIC_STAFF' && !clinicId) {
      setFormError('Please select your clinic.');
      return;
    }
    startTransition(async () => {
      const result =
        role === 'OWNER'
          ? await registerAction(values)
          : await registerClinicStaffAction({ ...values, clinicId });
      if (result.success) {
        toast.success(result.message ?? 'Registered successfully.');
        router.push('/login');
      } else {
        setFormError(result.message);
      }
    });
  }

  const roleBtn = (value: Role, label: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        role === value
          ? 'border-[#5E86AD] bg-[#E4EBF2] text-[#40638A]'
          : 'border-[#E6DFD3] bg-white text-[#6E675C] hover:bg-[#F1ECE3]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>
          I am registering as
        </label>
        <div className="flex gap-2">
          {roleBtn('OWNER', 'Pet Owner')}
          {roleBtn('CLINIC_STAFF', 'Clinic Staff')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormInput label="First name" error={errors.firstName?.message} {...register('firstName')} />
        <FormInput label="Last name" error={errors.lastName?.message} {...register('lastName')} />
      </div>

      <FormInput label="Phone (optional)" {...register('phone')} />
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

      {role === 'CLINIC_STAFF' && (
        <div>
          <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>
            Clinic
          </label>
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="w-full h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] focus:border-[#5E86AD] transition-colors text-[#2D2A26]"
          >
            <option value="">Select your clinic</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {formError && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 border"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#C4534E', fontSize: '13px' }}
        >
          <XCircle size={15} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="pw-btn-primary w-full rounded-full flex items-center justify-center"
        style={{ minHeight: '44px' }}
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
