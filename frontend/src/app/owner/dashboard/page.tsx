import Link from 'next/link';
import { Metadata } from 'next';
import { format } from 'date-fns';
import { Building2, PawPrint, CalendarDays, Bell, Sparkles, Plus } from 'lucide-react';
import { getSessionUser } from '@/lib/session';
import { PetApi } from '@/lib/api/pet.api';
import { AppointmentApi } from '@/lib/api/appointment.api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Appointment, Pet } from '@/lib/api/api.type';

export const metadata: Metadata = { title: 'Dashboard' };

const card =
  'bg-white border border-[#E6DFD3] rounded-2xl shadow-[0_2px_8px_rgba(45,42,38,0.06)]';

export default async function OwnerDashboardPage() {
  const user = await getSessionUser();
  const [pets, appts] = await Promise.all([
    PetApi.listMine().catch((): Pet[] => []),
    AppointmentApi.listMine().catch((): Appointment[] => []),
  ]);
  const upcoming = appts.filter((a) =>
    ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status),
  );

  return (
    <div className="pw-fade max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '28px' }}>
          Welcome back, {user?.firstName}
        </h2>
        <p className="text-[#6E675C] mt-1">Here&apos;s what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="pw-lift p-5 rounded-2xl border border-[#E6DFD3] shadow-[0_2px_8px_rgba(45,42,38,0.06)]"
          style={{ backgroundColor: '#E4EBF2' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
              <PawPrint size={18} className="text-[#5E86AD]" />
            </div>
            <div>
              <p className="font-display text-[#2D2A26] leading-none" style={{ fontSize: '28px' }}>
                {pets.length}
              </p>
              <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>Pets</p>
            </div>
          </div>
        </div>
        <div
          className="pw-lift p-5 rounded-2xl border border-[#E6DFD3] shadow-[0_2px_8px_rgba(45,42,38,0.06)]"
          style={{ backgroundColor: '#EFEBF8' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
              <CalendarDays size={18} className="text-[#6F63BE]" />
            </div>
            <div>
              <p className="font-display text-[#2D2A26] leading-none" style={{ fontSize: '28px' }}>
                {upcoming.length}
              </p>
              <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>Upcoming appointments</p>
            </div>
          </div>
        </div>
        <div
          className="pw-lift p-5 rounded-2xl border border-[#E6DFD3] shadow-[0_2px_8px_rgba(45,42,38,0.06)]"
          style={{ backgroundColor: '#FBEDE7' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
              <Bell size={18} className="text-[#E58A6F]" />
            </div>
            <div>
              <p className="font-display text-[#2D2A26] leading-none" style={{ fontSize: '28px' }}>0</p>
              <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>Vaccine reminders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${card} p-5`}>
          <h3 className="font-display text-[#2D2A26] mb-4">Upcoming appointments</h3>
          {upcoming.length === 0 ? (
            <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
              No upcoming appointments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2 border-b border-[#F1ECE3] last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F1ECE3] flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-[#A39B8D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#2D2A26] text-sm truncate">
                      {a.clinic?.name ?? 'Clinic'} / {a.pet?.name ?? 'Pet'}
                    </p>
                    <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>
                      {format(new Date(a.appointmentDate), 'EEE d MMM, HH:mm')}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
          <Link href="/owner/appointments" className="no-underline">
            <p className="text-[#5E86AD] mt-3 hover:text-[#40638A]" style={{ fontSize: '13px' }}>
              View all →
            </p>
          </Link>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-display text-[#2D2A26] mb-4">Vaccine reminders</h3>
          <div className="flex items-center gap-2 text-[#6E675C]" style={{ fontSize: '13px' }}>
            <Sparkles size={14} />
            No reminders — you&apos;re all caught up!
          </div>
        </div>
      </div>

      <div>
        <Link href="/owner/appointments/book" className="no-underline">
          <button
            className="pw-btn-primary rounded-full px-6 flex items-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Plus size={16} />
            Book New Appointment
          </button>
        </Link>
      </div>
    </div>
  );
}
