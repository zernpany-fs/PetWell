'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pet } from '@/lib/api/api.type';
import { updatePetAction, archivePetAction } from '@/lib/actions/pet.action';
import { FormInput } from '@/components/features/auth/FormInput';
import { DatePicker } from '@/components/ui/date-picker';

export default function EditPetForm({ pet }: { pet: Pet }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [archiving, startArchive] = useTransition();
  const [f, setF] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : '',
    latestWeight: pet.latestWeight != null ? String(pet.latestWeight) : '',
    microchipNo: pet.microchipNo ?? '',
    chronicCondition: pet.chronicCondition ?? '',
    drugAllergy: pet.drugAllergy ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function save() {
    startTransition(async () => {
      const r = await updatePetAction(pet.id, {
        name: f.name,
        species: f.species,
        breed: f.breed || undefined,
        birthDate: f.birthDate || undefined,
        latestWeight: f.latestWeight ? Number(f.latestWeight) : undefined,
        microchipNo: f.microchipNo || undefined,
        chronicCondition: f.chronicCondition || undefined,
        drugAllergy: f.drugAllergy || undefined,
      });
      if (r.success) {
        toast.success(r.message ?? 'Saved.');
        router.push(`/owner/pets/${pet.id}`);
      } else toast.error(r.message);
    });
  }

  function archive() {
    if (!confirm('Archive this pet? Its records are kept.')) return;
    startArchive(async () => {
      const r = await archivePetAction(pet.id);
      if (r.success) {
        toast.success(r.message ?? 'Archived.');
        router.push('/owner/pets');
      } else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Name" value={f.name} onChange={set('name')} />
        <FormInput label="Species" value={f.species} onChange={set('species')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Breed" value={f.breed} onChange={set('breed')} />
        <div>
          <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Birth date</label>
          <DatePicker
            mode="date"
            value={f.birthDate}
            onChange={(v) => setF((prev) => ({ ...prev, birthDate: v }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Weight kg" type="number" step="0.1" value={f.latestWeight} onChange={set('latestWeight')} />
        <FormInput label="Microchip no." value={f.microchipNo} onChange={set('microchipNo')} />
      </div>
      <FormInput label="Chronic condition" value={f.chronicCondition} onChange={set('chronicCondition')} />
      <FormInput label="Drug allergy" value={f.drugAllergy} onChange={set('drugAllergy')} />

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-3">
          <button disabled={pending} onClick={save} className="pw-btn-primary rounded-full px-6" style={{ minHeight: '44px' }}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/owner/pets/${pet.id}`)}
            className="rounded-full px-6 bg-white border-[1.5px] border-[#5E86AD] text-[#5E86AD] hover:bg-[#E4EBF2] transition-colors"
            style={{ minHeight: '44px' }}
          >
            Cancel
          </button>
        </div>
        <button
          type="button"
          disabled={archiving}
          onClick={archive}
          className="rounded-full px-4 bg-[#FEF2F2] border border-[#FECACA] text-[#C4534E] hover:bg-[#FEE2E2] transition-colors disabled:opacity-60"
          style={{ minHeight: '44px', fontSize: '14px' }}
        >
          {archiving ? '…' : 'Archive'}
        </button>
      </div>
    </div>
  );
}
