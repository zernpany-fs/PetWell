import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import LogoutButton from '@/components/features/auth/LogoutButton';

export type NavLink = { href: string; label: string };

export function TopNav({
  links,
  userName,
}: {
  links: NavLink[];
  userName?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-muted hover:text-neutral-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-sm text-neutral-500 sm:inline">
              {userName}
            </span>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
