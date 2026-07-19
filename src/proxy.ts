export { proxy } from '@/lib/auth/middleware';

export const config = {
  matcher: [
    '/admin/:path*',
    '/portal/dashboard/:path*',
    '/portal/courses/:path*',
    '/portal/events/:path*',
    '/portal/packages/:path*',
    '/portal/ib/:path*',
    '/portal/profile/:path*',
  ],
};
