'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { cancelAppointmentAction } from '@/lib/actions/appointment.action';

export default function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await cancelAppointmentAction(id);
          r.success ? toast.success(r.message ?? 'Cancelled.') : toast.error(r.message);
        })
      }
      className="rounded-full px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-[#C4534E] hover:bg-[#FEE2E2] transition-colors disabled:opacity-60"
      style={{ fontSize: '12px', minHeight: '36px' }}
    >
      {pending ? '…' : 'Cancel'}
    </button>
  );
}
