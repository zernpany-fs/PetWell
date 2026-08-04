'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RecordType } from '@/lib/api/api.type';
import { createHealthRecordAction } from '@/lib/actions/health-record.action';
import { FormInput } from '@/components/features/auth/FormInput';
import { DatePicker } from '@/components/ui/date-picker';

export default function AddHealthRecordForm({ petId }: { petId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recordType, setRecordType] = useState<RecordType>('VACCINE');
  const [description, setDescription] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!description || !recordDate) {
      setError('Description and record date are required.');
      return;
    }
    startTransition(async () => {
      const r = await createHealthRecordAction(petId, {
        recordType,
        description,
        recordDate,
        nextDueDate: nextDueDate || undefined,
      });
      if (r.success) {
        toast.success(r.message ?? 'Record added.');
        setDescription('');
        setRecordDate('');
        setNextDueDate('');
        router.refresh();
      } else setError(r.message);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Type</label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType)}
          className="w-full h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
        >
          <option value="VACCINE">Vaccine</option>
          <option value="TREATMENT">Treatment</option>
        </select>
      </div>
      <FormInput
        label="Description"
        placeholder="e.g. Rabies booster"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Record date</label>
          <DatePicker mode="date" value={recordDate} onChange={setRecordDate} />
        </div>
        <div>
          <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>Next due (optional)</label>
          <DatePicker mode="date" value={nextDueDate} onChange={setNextDueDate} />
        </div>
      </div>

      {error && <p className="text-[#C4534E]" style={{ fontSize: '13px' }}>{error}</p>}

      <button disabled={pending} onClick={submit} className="pw-btn-primary rounded-full px-6" style={{ minHeight: '44px' }}>
        {pending ? 'Saving…' : 'Add record'}
      </button>
    </div>
  );
}
