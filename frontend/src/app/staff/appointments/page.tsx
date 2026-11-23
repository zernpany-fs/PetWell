import Link from 'next/link';
import { Metadata } from 'next';
import { formatAppTime } from '@/lib/datetime';
import { PawPrint, Phone } from 'lucide-react';
import { getSessionUser } from '@/lib/session';
import { AppointmentApi } from '@/lib/api/appointment.api';
import { Appointment } from '@/lib/api/api.type';
import { StatusBadge } from '@/components/shared/StatusBadge';
import StatusActions from '@/components/features/appointment/StatusActions';

export const metadata: Metadata = { title: 'Appointments' };

export default async function StaffAppointmentsPage() {
  const user = await getSessionUser();
  const appts = user?.clinicId
    ? await AppointmentApi.listByClinic(user.clinicId).catch(
        (): Appointment[] => [],
      )
    : [];

  const pending = appts.filter((a) => a.status === 'PENDING');
  const rest = appts.filter((a) => a.status !== 'PENDING');

  const Row = ({ a }: { a: Appointment }) => (
    <div className="bg-white border border-pw-line rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-pw-sand flex items-center justify-center shrink-0">
        <PawPrint size={16} className="text-pw-faint" />
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/staff/pets/${a.petId}`} className="no-underline">
          <p className="text-pw-ink truncate hover:text-pw-primary">
            {a.pet?.name ?? 'Pet'} ({a.pet?.species ?? '—'})
          </p>
        </Link>
        <Link href={`/staff/appointments/${a.id}`} className="no-underline">
          <p
            className="text-pw-muted hover:text-pw-primary"
            style={{ fontSize: '13px' }}
          >
            {formatAppTime(a.appointmentDate, 'EEE d MMM yyyy, HH:mm')} ·
            History
          </p>
        </Link>
        {a.notes && (
          <p
            className="flex items-center gap-1.5 mt-0.5 text-pw-muted"
            style={{ fontSize: '12px' }}
          >
            <Phone size={12} /> {a.notes}
          </p>
        )}
      </div>
      <StatusBadge status={a.status} />
      <StatusActions id={a.id} status={a.status} />
    </div>
  );

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <h2 className="font-display text-pw-ink" style={{ fontSize: '26px' }}>
        Appointment Management
      </h2>

      <div>
        <h3
          className="font-display text-pw-ink mb-3"
          style={{ fontSize: '18px' }}
        >
          New requests{' '}
          {pending.length > 0 && (
            <span className="text-pw-muted">({pending.length})</span>
          )}
        </h3>
        {pending.length === 0 ? (
          <p className="text-pw-muted" style={{ fontSize: '14px' }}>
            No pending requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3
          className="font-display text-pw-ink mb-3"
          style={{ fontSize: '18px' }}
        >
          All appointments
        </h3>
        {rest.length === 0 ? (
          <p className="text-pw-muted" style={{ fontSize: '14px' }}>
            Nothing scheduled yet.
          </p>
        ) : (
          <div className="space-y-3">
            {rest.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
