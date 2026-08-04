'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PawPrint,
  Building2,
  Calendar,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.action';
import { ProfileMenu } from './ProfileMenu';

type NavItem = { href: string; icon: LucideIcon; label: string };

const NAV: Record<'owner' | 'staff', NavItem[]> = {
  owner: [
    { href: '/owner/dashboard', icon: Home, label: 'Home' },
    { href: '/owner/pets', icon: PawPrint, label: 'My Pets' },
    { href: '/owner/clinics', icon: Building2, label: 'Clinics' },
    { href: '/owner/appointments', icon: Calendar, label: 'Appointments' },
  ],
  staff: [
    { href: '/staff/dashboard', icon: Home, label: 'Home' },
    { href: '/staff/pets', icon: PawPrint, label: 'Patients' },
    { href: '/staff/clinic', icon: Building2, label: 'Clinic Profile' },
    { href: '/staff/appointments', icon: Calendar, label: 'Appointments' },
  ],
};

export function AppShell({
  area,
  userName,
  children,
}: {
  area: 'owner' | 'staff';
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = NAV[area];
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const active = navItems.find((n) => pathname.startsWith(n.href));
  const title = active?.label === 'Home' ? 'Dashboard' : (active?.label ?? 'PetWell');

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex">
      <aside className="hidden md:flex flex-col w-[230px] min-h-screen bg-white border-r border-[#E6DFD3] fixed left-0 top-0 z-40">
        <div className="p-5 border-b border-[#E6DFD3]">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <PawPrint className="w-5 h-5 text-[#5E86AD]" />
            <span className="font-display text-lg text-[#2D2A26]">PetWell</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm no-underline ${
                  isActive
                    ? 'bg-[#E4EBF2] text-[#5E86AD]'
                    : 'text-[#6E675C] hover:bg-[#F1ECE3] hover:text-[#2D2A26]'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#E6DFD3]">
          <div className="px-3 py-2 text-sm text-[#6E675C]">{userName}</div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[#6E675C] hover:bg-[#F1ECE3] text-sm transition-colors text-left"
            >
              <LogOut size={16} />
              Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 md:ml-[230px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-[#E6DFD3] h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <span className="font-display text-lg text-[#2D2A26]">{title}</span>
          <ProfileMenu area={area} userName={userName} initials={initials} />
        </header>
        <main className="flex-1 pb-20 md:pb-8 overflow-auto">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6DFD3] flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors no-underline ${
                isActive ? 'text-[#5E86AD]' : 'text-[#6E675C]'
              }`}
            >
              <Icon size={20} />
              <span style={{ fontSize: '10px' }}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
