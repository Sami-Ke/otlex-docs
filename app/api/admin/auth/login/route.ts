import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import {
  checkLoginThrottle,
  clearLoginFailures,
  getLoginThrottleKey,
  recordLoginFailure,
} from '@/lib/admin-login-throttle';

type LoginBody = { password?: unknown };

async function readPassword(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as LoginBody;
      return typeof body.password === 'string' ? body.password : null;
    } catch {
      return null;
    }
  }

  // 後備：允許 form submit
  try {
    const form = await request.formData();
    const password = form.get('password');
    return typeof password === 'string' ? password : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const throttleKey = getLoginThrottleKey(request);
  const throttle = checkLoginThrottle(throttleKey);
  if (throttle.blocked) {
    const response = NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(throttle.retryAfterSeconds));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const password = await readPassword(request);
  if (!password) {
    return NextResponse.json({ error: 'Missing password' }, { status: 400 });
  }

  const expectedHash = (process.env.ADMIN_PASSWORD_HASH ?? '').trim().toLowerCase();
  if (!expectedHash) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing ADMIN_PASSWORD_HASH' },
      { status: 500 }
    );
  }

  const isValidPassword = await verifyPassword(password, expectedHash);
  if (!isValidPassword) {
    const failedState = recordLoginFailure(throttleKey);
    const response = NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    response.headers.set('Cache-Control', 'no-store');
    if (failedState.blocked) {
      response.headers.set('Retry-After', String(failedState.retryAfterSeconds));
    }
    return response;
  }

  const secret = (process.env.ADMIN_JWT_SECRET ?? '').trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing ADMIN_JWT_SECRET' },
      { status: 500 }
    );
  }

  const token = await createSession(secret);
  clearLoginFailures(throttleKey);

  const res = NextResponse.json({ success: true }, { status: 200 });
  res.headers.set('Cache-Control', 'no-store');

  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
