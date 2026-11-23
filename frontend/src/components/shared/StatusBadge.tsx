import { AppointmentStatus } from '@/lib/api/api.type';

const styles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'var(--color-pw-warning-soft)', text: 'var(--color-pw-warning)', label: 'Pending' },
  CONFIRMED: { bg: 'var(--color-pw-primary-tint)', text: 'var(--color-pw-primary-strong)', label: 'Confirmed' },
  RESCHEDULED: { bg: 'var(--color-pw-violet-tint)', text: 'var(--color-pw-violet)', label: 'Rescheduled' },
  COMPLETED: { bg: 'var(--color-pw-success-tint)', text: 'var(--color-pw-success)', label: 'Completed' },
  REJECTED: { bg: 'var(--color-pw-danger-soft)', text: 'var(--color-pw-danger)', label: 'Rejected' },
  CANCELLED: { bg: 'var(--color-pw-sand-2)', text: 'var(--color-pw-faint-2)', label: 'Cancelled' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = styles[status];
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text, fontSize: '12px' }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
    >
      {s.label}
    </span>
  );
}
