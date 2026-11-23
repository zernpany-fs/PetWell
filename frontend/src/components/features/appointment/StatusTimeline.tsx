import { formatAppTime } from '@/lib/datetime';
import { AppointmentStatus, AppointmentStatusLog } from '@/lib/api/api.type';

const DOT: Record<AppointmentStatus, string> = {
  PENDING: 'var(--color-pw-warning)',
  CONFIRMED: 'var(--color-pw-primary)',
  RESCHEDULED: 'var(--color-pw-violet)',
  COMPLETED: 'var(--color-pw-success)',
  REJECTED: 'var(--color-pw-danger)',
  CANCELLED: 'var(--color-pw-faint-2)',
};

const LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function StatusTimeline({
  logs,
  requestedAt,
}: {
  logs: AppointmentStatusLog[];
  requestedAt?: string;
}) {
  const hasEvents = logs.length > 0 || Boolean(requestedAt);

  if (!hasEvents) {
    return (
      <p className="text-pw-muted" style={{ fontSize: '14px' }}>
        No status changes recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative ml-1.5 list-none p-0 m-0">
      <span
        aria-hidden
        className="absolute left-[5px] top-2 bottom-2 w-px bg-pw-line"
      />

      {requestedAt && (
        <li className="relative pl-6 pb-5">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white"
            style={{ backgroundColor: 'var(--color-pw-faint)' }}
          />
          <p className="text-pw-ink" style={{ fontSize: '14px' }}>
            Requested by owner
          </p>
          <p className="text-pw-muted" style={{ fontSize: '12px' }}>
            {formatAppTime(requestedAt, 'd MMM yyyy, HH:mm')}
          </p>
        </li>
      )}

      {logs.map((log, i) => (
        <li
          key={log.id}
          className={`relative pl-6 ${i === logs.length - 1 ? '' : 'pb-5'}`}
        >
          <span
            aria-hidden
            className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white"
            style={{ backgroundColor: DOT[log.newStatus] }}
          />
          <p className="text-pw-ink" style={{ fontSize: '14px' }}>
            {log.oldStatus ? `${LABEL[log.oldStatus]} → ` : ''}
            <span style={{ color: DOT[log.newStatus] }}>
              {LABEL[log.newStatus]}
            </span>
          </p>
          <p className="text-pw-muted" style={{ fontSize: '12px' }}>
            {formatAppTime(log.changedAt, 'd MMM yyyy, HH:mm')}
            {log.changedBy
              ? ` · ${log.changedBy.firstName} ${log.changedBy.lastName}` +
                (log.changedBy.role === 'CLINIC_STAFF'
                  ? ' (clinic)'
                  : ' (owner)')
              : ''}
          </p>
          {log.reason && (
            <p
              className="mt-1 px-3 py-2 rounded-lg bg-pw-sand text-pw-muted"
              style={{ fontSize: '13px' }}
            >
              {log.reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
