import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', request.url));
  res.headers.set('Cache-Control', 'no-store');

  res.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}

