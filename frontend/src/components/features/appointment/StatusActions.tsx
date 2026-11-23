'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { AppointmentStatus } from '@/lib/api/api.type';
import { updateAppointmentStatusAction } from '@/lib/actions/appointment.action';

const NEXT: Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string; kind: 'primary' | 'danger' | 'plain' }[]>> = {
  PENDING: [
    { to: 'CONFIRMED', label: 'Confirm', kind: 'primary' },
    { to: 'REJECTED', label: 'Reject', kind: 'danger' },
  ],
  CONFIRMED: [
    { to: 'COMPLETED', label: 'Mark completed', kind: 'primary' },
    { to: 'CANCELLED', label: 'Cancel', kind: 'danger' },
  ],
  RESCHEDULED: [
    { to: 'CONFIRMED', label: 'Confirm', kind: 'primary' },
    { to: 'REJECTED', label: 'Reject', kind: 'danger' },
  ],
};

export default function StatusActions({
  id,
  status,
}: {
  id: string;
  status: AppointmentStatus;
}) {
  const [pending, startTransition] = useTransition();
  const actions = NEXT[status];
  if (!actions) return null;

  function run(to: AppointmentStatus) {
    startTransition(async () => {
      const r = await updateAppointmentStatusAction(id, { status: to });
      r.success ? toast.success(r.message ?? 'Updated.') : toast.error(r.message);
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {actions.map((a) => (
        <button
          key={a.to}
          disabled={pending}
          onClick={() => run(a.to)}
          className={
            a.kind === 'primary'
              ? 'min-h-11 inline-flex items-center justify-center pw-btn-primary rounded-full px-3 py-1.5 disabled:opacity-60'
              : 'min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1.5 bg-pw-danger-tint border border-pw-danger-line text-pw-danger hover:bg-pw-danger-tint-2 transition-colors disabled:opacity-60'
          }
          style={{ fontSize: '12px', minHeight: '36px' }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
