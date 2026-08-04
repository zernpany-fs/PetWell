'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPetSchema, CreatePetInput } from '@/lib/schemas/pet.schema';
import { createPetAction } from '@/lib/actions/pet.action';
import { FormInput } from '@/components/features/auth/FormInput';
import { DatePicker } from '@/components/ui/date-picker';

export default function AddPetForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePetInput>({ resolver: standardSchemaResolver(createPetSchema) });
  const birthDate = watch('birthDate') ?? '';

  function onSubmit(values: CreatePetInput) {
    setError(null);
    startTransition(async () => {
      const result = await createPetAction(values);
      if (result.success) {
        toast.success(result.message ?? 'Pet added.');
        router.push('/owner/pets');
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Name" error={errors.name?.message} {...register('name')} />
        <FormInput label="Species" placeholder="Dog, Cat…" error={errors.species?.message} {...register('species')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Breed (optional)" {...register('breed')} />
        <div>
          <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Birth date (optional)</label>
          <DatePicker mode="date" value={birthDate} onChange={(v) => setValue('birthDate', v)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Weight kg (optional)" type="number" step="0.1" {...register('latestWeight')} />
        <FormInput label="Microchip no. (optional)" {...register('microchipNo')} />
      </div>
      <FormInput label="Chronic condition (optional)" {...register('chronicCondition')} />
      <FormInput label="Drug allergy (optional)" {...register('drugAllergy')} />

      {error && (
        <p className="text-[#C4534E]" style={{ fontSize: '13px' }}>{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="pw-btn-primary rounded-full px-6"
          style={{ minHeight: '44px' }}
        >
          {pending ? 'Saving…' : 'Add pet'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/owner/pets')}
          className="rounded-full px-6 bg-white border-[1.5px] border-[#5E86AD] text-[#5E86AD] hover:bg-[#E4EBF2] transition-colors"
          style={{ minHeight: '44px' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
