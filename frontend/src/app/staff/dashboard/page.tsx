import Link from 'next/link';
import { Metadata } from 'next';
import { formatAppTime, isTodayInApp } from '@/lib/datetime';
import { AlertCircle, FileText } from 'lucide-react';
import { getSessionUser } from '@/lib/session';
import { AppointmentApi } from '@/lib/api/appointment.api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Appointment } from '@/lib/api/api.type';

export const metadata: Metadata = { title: 'Dashboard' };

const card =
  'bg-white border border-pw-line rounded-2xl shadow-[0_2px_8px_rgba(45,42,38,0.06)]';

export default async function StaffDashboardPage() {
  const user = await getSessionUser();
  const appts = user?.clinicId
    ? await AppointmentApi.listByClinic(user.clinicId).catch(
        (): Appointment[] => [],
      )
    : [];

  const pending = appts.filter((a) => a.status === 'PENDING');
  const todays = appts.filter(
    (a) => a.status === 'CONFIRMED' && isTodayInApp(a.appointmentDate),
  );

  return (
    <div className="pw-fade max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h2
          className="font-display text-pw-ink"
          style={{ fontSize: '26px' }}
        >
          Welcome, {user?.firstName}
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div
          className="pw-lift rounded-2xl p-5 border border-pw-line shadow-[0_2px_8px_rgba(45,42,38,0.06)]"
          style={{ backgroundColor: 'var(--color-pw-warning-tint)' }}
        >
          <p
            className="font-display text-pw-ink"
            style={{ fontSize: '32px' }}
          >
            {pending.length}
          </p>
          <p className="text-pw-warning-strong">Pending requests</p>
        </div>
        <div className={`pw-lift ${card} p-5`}>
          <p
            className="font-display text-pw-ink"
            style={{ fontSize: '32px' }}
          >
            {todays.length}
          </p>
          <p className="text-pw-muted">Appointments today</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${card} p-5`}>
          <h3 className="font-display text-pw-ink mb-4">New requests</h3>
          {pending.length === 0 ? (
            <p className="text-pw-muted mb-4" style={{ fontSize: '14px' }}>
              No pending requests right now.
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {pending.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="py-3 border-b border-pw-sand last:border-0"
                >
                  <p className="text-pw-ink text-sm">
                    {r.pet?.name ?? 'Pet'} ({r.pet?.species ?? '—'})
                  </p>
                  <p className="text-pw-muted" style={{ fontSize: '13px' }}>
                    {formatAppTime(r.appointmentDate, 'EEE d MMM, HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 border border-pw-warning-line-2 bg-pw-warning-tint"
            style={{ color: 'var(--color-pw-warning-strong)', fontSize: '12px' }}
          >
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            Remember to call the owner to confirm before marking as Confirmed.
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-display text-pw-ink mb-4">
            Today&apos;s schedule
          </h3>
          {todays.length === 0 ? (
            <p className="text-pw-muted" style={{ fontSize: '14px' }}>
              Nothing scheduled for today.
            </p>
          ) : (
            <div className="space-y-3">
              {todays.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 py-2 border-b border-pw-sand last:border-0"
                >
                  <span
                    className="text-pw-muted shrink-0 w-12"
                    style={{ fontSize: '13px' }}
                  >
                    {formatAppTime(s.appointmentDate, 'HH:mm')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-pw-ink text-sm">
                      {s.pet?.name ?? 'Pet'}
                    </span>
                  </div>
                  <StatusBadge status={s.status} />
                  <Link
                    href={`/staff/pets/${s.petId}`}
                    className="no-underline shrink-0"
                    aria-label={`Open health records for ${s.pet?.name ?? 'this pet'}`}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors"
                      style={{ fontSize: '12px' }}
                    >
                      <FileText size={13} /> Records
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <Link href="/staff/appointments" className="no-underline">
            <p
              className="text-pw-primary mt-3 hover:text-pw-primary-strong"
              style={{ fontSize: '13px' }}
            >
              View all appointments →
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
