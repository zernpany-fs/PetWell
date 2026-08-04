import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  PawPrint,
  StickyNote,
} from 'lucide-react';
import { Appointment, AppointmentStatusLog } from '@/lib/api/api.type';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTimeline } from './StatusTimeline';
import CancelButton from './CancelButton';
import StatusActions from './StatusActions';

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];

const card =
  'bg-white border border-[#E6DFD3] rounded-2xl shadow-[0_2px_8px_rgba(45,42,38,0.06)]';

export function AppointmentDetail({
  appointment,
  logs,
  area,
}: {
  appointment: Appointment;
  logs: AppointmentStatusLog[];
  area: 'owner' | 'staff';
}) {
  const a = appointment;

  return (
    <div className="pw-fade max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href={`/${area}/appointments`}
        className="inline-flex items-center gap-1.5 text-[#6E675C] hover:text-[#2D2A26] no-underline"
        style={{ fontSize: '14px' }}
      >
        <ArrowLeft size={14} /> Back to appointments
      </Link>

      <div className={`${card} p-6`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              className="font-display text-[#2D2A26]"
              style={{ fontSize: '24px' }}
            >
              {format(new Date(a.appointmentDate), 'EEEE d MMMM yyyy')}
            </h2>
            <p className="text-[#6E675C]">
              {format(new Date(a.appointmentDate), 'HH:mm')}
            </p>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <dl className="space-y-2.5 m-0">
          <div className="flex items-center gap-2.5">
            <PawPrint size={15} className="text-[#A39B8D] shrink-0" />
            <dt className="sr-only">Pet</dt>
            <dd className="m-0 text-[#2D2A26]" style={{ fontSize: '14px' }}>
              {area === 'staff' ? (
                <Link
                  href={`/staff/pets/${a.petId}`}
                  className="text-[#5E86AD] no-underline hover:underline"
                >
                  {a.pet?.name ?? 'Pet'}
                </Link>
              ) : (
                <Link
                  href={`/owner/pets/${a.petId}`}
                  className="text-[#5E86AD] no-underline hover:underline"
                >
                  {a.pet?.name ?? 'Pet'}
                </Link>
              )}
              {a.pet?.species ? (
                <span className="text-[#6E675C]"> · {a.pet.species}</span>
              ) : null}
            </dd>
          </div>

          <div className="flex items-center gap-2.5">
            <Building2 size={15} className="text-[#A39B8D] shrink-0" />
            <dt className="sr-only">Clinic</dt>
            <dd className="m-0 text-[#2D2A26]" style={{ fontSize: '14px' }}>
              {a.clinic?.name ?? 'Clinic'}
            </dd>
          </div>

          <div className="flex items-center gap-2.5">
            <CalendarDays size={15} className="text-[#A39B8D] shrink-0" />
            <dt className="sr-only">Requested</dt>
            <dd className="m-0 text-[#6E675C]" style={{ fontSize: '14px' }}>
              Requested {format(new Date(a.createdAt), 'd MMM yyyy')}
            </dd>
          </div>

          {a.notes && (
            <div className="flex items-start gap-2.5">
              <StickyNote size={15} className="text-[#A39B8D] shrink-0 mt-0.5" />
              <dt className="sr-only">Notes</dt>
              <dd className="m-0 text-[#2D2A26]" style={{ fontSize: '14px' }}>
                {a.notes}
              </dd>
            </div>
          )}
        </dl>

        {area === 'staff' ? (
          <div className="mt-5 pt-5 border-t border-[#E6DFD3] flex justify-end">
            <StatusActions id={a.id} status={a.status} />
          </div>
        ) : (
          CANCELLABLE.includes(a.status) && (
            <div className="mt-5 pt-5 border-t border-[#E6DFD3] flex justify-end">
              <CancelButton id={a.id} />
            </div>
          )
        )}
      </div>

      <div className={`${card} p-6`}>
        <h3
          className="font-display text-[#2D2A26] mb-4"
          style={{ fontSize: '18px' }}
        >
          Status history
        </h3>
        <StatusTimeline logs={logs} requestedAt={a.createdAt} />
      </div>
    </div>
  );
}
