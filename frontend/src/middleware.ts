import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;
  const path = nextUrl.pathname;

  const isAuthPage = path === '/login' || path === '/register';
  const isOwnerArea = path.startsWith('/owner');
  const isStaffArea = path.startsWith('/staff');

  const dashboardFor = (r?: string) =>
    r === 'CLINIC_STAFF' ? '/staff/dashboard' : '/owner/dashboard';

  if (session && (isAuthPage || path === '/')) {
    return NextResponse.redirect(new URL(dashboardFor(role), nextUrl));
  }

  if (isOwnerArea) {
    if (!session) return NextResponse.redirect(new URL('/login', nextUrl));
    if (role !== 'OWNER')
      return NextResponse.redirect(new URL('/staff/dashboard', nextUrl));
  }

  if (isStaffArea) {
    if (!session) return NextResponse.redirect(new URL('/login', nextUrl));
    if (role !== 'CLINIC_STAFF')
      return NextResponse.redirect(new URL('/owner/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
