import Link from 'next/link';
import { Metadata } from 'next';
import { format } from 'date-fns';
import { Building2, Plus } from 'lucide-react';
import { AppointmentApi } from '@/lib/api/appointment.api';
import { Appointment } from '@/lib/api/api.type';
import { StatusBadge } from '@/components/shared/StatusBadge';
import CancelButton from '@/components/features/appointment/CancelButton';

export const metadata: Metadata = { title: 'Appointments' };

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];

export default async function MyAppointmentsPage() {
  const appts = await AppointmentApi.listMine().catch((): Appointment[] => []);

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '26px' }}>
          My Appointments
        </h2>
        <Link href="/owner/appointments/book" className="no-underline">
          <button className="pw-btn-primary rounded-full px-5 flex items-center gap-2" style={{ minHeight: '44px' }}>
            <Plus size={16} /> Book
          </button>
        </Link>
      </div>

      {appts.length === 0 ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-10 text-center">
          <p className="text-[#2D2A26] mb-1">No appointments yet</p>
          <p className="text-[#6E675C] mb-5" style={{ fontSize: '14px' }}>
            Book a visit at any partnered clinic.
          </p>
          <Link href="/owner/appointments/book" className="no-underline">
            <button className="pw-btn-primary rounded-full px-5" style={{ minHeight: '44px' }}>
              Book an appointment
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F1ECE3] flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-[#A39B8D]" />
              </div>
              <Link
                href={`/owner/appointments/${a.id}`}
                className="flex-1 min-w-0 no-underline"
              >
                <p className="text-[#2D2A26] truncate hover:text-[#5E86AD]">
                  {a.clinic?.name ?? 'Clinic'} · {a.pet?.name ?? 'Pet'}
                </p>
                <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>
                  {format(new Date(a.appointmentDate), 'EEE d MMM yyyy, HH:mm')}
                </p>
              </Link>
              <StatusBadge status={a.status} />
              {CANCELLABLE.includes(a.status) && <CancelButton id={a.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
