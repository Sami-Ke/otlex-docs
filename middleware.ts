import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_API_LOGIN_PATH = '/api/admin/auth/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允許未登入訪問登入頁與登入 API
  if (pathname === ADMIN_LOGIN_PATH || pathname === ADMIN_API_LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  const secret = process.env.ADMIN_JWT_SECRET ?? '';
  const session = token ? await verifySession(token, secret) : null;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
