'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.action';

export function ProfileMenu({
  area,
  userName,
  initials,
}: {
  area: 'owner' | 'staff';
  userName: string;
  initials: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-pw-primary flex items-center justify-center text-white text-xs select-none"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white border border-pw-line rounded-xl shadow-[0_8px_24px_rgba(45,42,38,0.12)] p-1.5 z-50"
        >
          <div className="px-2.5 py-2 border-b border-pw-sand mb-1">
            <p className="text-pw-ink text-sm truncate">{userName}</p>
            <p className="text-pw-muted" style={{ fontSize: '12px' }}>
              {area === 'owner' ? 'Pet Owner' : 'Clinic Staff'}
            </p>
          </div>

          <Link
            href={`/${area}/profile`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-pw-ink hover:bg-pw-sand no-underline"
            role="menuitem"
          >
            <User size={15} className="text-pw-muted" /> Profile
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-pw-danger hover:bg-pw-danger-tint text-left"
            >
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
