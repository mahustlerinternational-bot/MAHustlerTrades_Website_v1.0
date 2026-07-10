// src/lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res  = NextResponse.next();
  const path = req.nextUrl.pathname;

  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // ── Unauthenticated → redirect to login ─────────────────
  if (!session) {
    if (path.startsWith('/admin') || path.startsWith('/portal')) {
      const loginUrl = new URL('/portal', req.url);
      loginUrl.searchParams.set('tab', 'login');
      loginUrl.searchParams.set('returnTo', path);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ── Admin routes — require admin role ───────────────────
  if (path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/portal/dashboard/:path*', '/portal/courses/:path*',
            '/portal/events/:path*', '/portal/packages/:path*', '/portal/ib/:path*', '/portal/profile/:path*'],
};
