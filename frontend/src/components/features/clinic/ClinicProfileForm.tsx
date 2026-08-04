'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Clinic, ClinicType } from '@/lib/api/api.type';
import { updateClinicAction } from '@/lib/actions/clinic.action';
import { FormInput } from '@/components/features/auth/FormInput';

export default function ClinicProfileForm({ clinic }: { clinic: Clinic }) {
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    name: clinic.name,
    address: clinic.address ?? '',
    phone: clinic.phone ?? '',
    description: clinic.description ?? '',
    clinicType: clinic.clinicType,
    googleMapsLink: clinic.googleMapsLink ?? '',
  });

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function save() {
    startTransition(async () => {
      const r = await updateClinicAction(clinic.id, {
        ...f,
        clinicType: f.clinicType as ClinicType,
      });
      r.success ? toast.success(r.message ?? 'Saved.') : toast.error(r.message);
    });
  }

  return (
    <div className="space-y-4">
      <FormInput label="Clinic name" value={f.name} onChange={set('name')} />
      <FormInput label="Address" value={f.address} onChange={set('address')} />
      <FormInput label="Phone" value={f.phone} onChange={set('phone')} />
      <div>
        <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Type</label>
        <select
          value={f.clinicType}
          onChange={set('clinicType')}
          className="w-full h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
        >
          <option value="GENERAL">General</option>
          <option value="EXOTIC">Exotic</option>
          <option value="EMERGENCY_24HR">24hr Emergency</option>
        </select>
      </div>
      <div>
        <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Description</label>
        <textarea
          value={f.description}
          onChange={set('description')}
          rows={3}
          className="w-full px-4 py-3 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
        />
      </div>
      <FormInput label="Google Maps link" value={f.googleMapsLink} onChange={set('googleMapsLink')} />

      <button
        disabled={pending}
        onClick={save}
        className="pw-btn-primary rounded-full px-6"
        style={{ minHeight: '44px' }}
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
