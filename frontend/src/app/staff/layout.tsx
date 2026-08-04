import { requireRole } from '@/lib/session';
import { AppShell } from '@/components/layout/AppShell';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole('CLINIC_STAFF');
  return (
    <AppShell area="staff" userName={`${user.firstName} ${user.lastName}`}>
      {children}
    </AppShell>
  );
}
