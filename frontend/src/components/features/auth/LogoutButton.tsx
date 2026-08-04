'use client';

import { logoutAction } from '@/lib/actions/auth.action';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="mr-1 size-4" /> Log out
      </Button>
    </form>
  );
}
