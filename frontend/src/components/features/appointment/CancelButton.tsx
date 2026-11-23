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
      className="min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1.5 bg-pw-danger-tint border border-pw-danger-line text-pw-danger hover:bg-pw-danger-tint-2 transition-colors disabled:opacity-60"
      style={{ fontSize: '12px', minHeight: '36px' }}
    >
      {pending ? '…' : 'Cancel'}
    </button>
  );
}
