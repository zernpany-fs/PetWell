import { requireRole } from '@/lib/session';
import { AppShell } from '@/components/layout/AppShell';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole('OWNER');
  return (
    <AppShell area="owner" userName={`${user.firstName} ${user.lastName}`}>
      {children}
    </AppShell>
  );
}
