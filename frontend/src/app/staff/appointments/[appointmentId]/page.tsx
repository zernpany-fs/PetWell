import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { AppointmentApi } from '@/lib/api/appointment.api';
import { AppointmentStatusLog } from '@/lib/api/api.type';
import { AppointmentDetail } from '@/components/features/appointment/AppointmentDetail';

export const metadata: Metadata = { title: 'Appointment' };

export default async function StaffAppointmentDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const appointment = await AppointmentApi.get(appointmentId).catch(() => null);
  if (!appointment) notFound();

  const logs = await AppointmentApi.logs(appointmentId).catch(
    (): AppointmentStatusLog[] => [],
  );

  return (
    <AppointmentDetail appointment={appointment} logs={logs} area="staff" />
  );
}
