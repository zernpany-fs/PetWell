import { AppointmentStatus } from '@/lib/api/api.type';

const styles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#F8EEDB', text: '#C08A2D', label: 'Pending' },
  CONFIRMED: { bg: '#E4EBF2', text: '#40638A', label: 'Confirmed' },
  RESCHEDULED: { bg: '#EFEBF8', text: '#8B7FD1', label: 'Rescheduled' },
  COMPLETED: { bg: '#E7F2EA', text: '#58996F', label: 'Completed' },
  REJECTED: { bg: '#F8E6E4', text: '#C4534E', label: 'Rejected' },
  CANCELLED: { bg: '#EFECE4', text: '#8B8474', label: 'Cancelled' },
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
