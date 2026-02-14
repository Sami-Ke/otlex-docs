import { NextRequest, NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';

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

  const providedHash = (await hashPassword(password)).toLowerCase();
  if (providedHash !== expectedHash) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const secret = (process.env.ADMIN_JWT_SECRET ?? '').trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing ADMIN_JWT_SECRET' },
      { status: 500 }
    );
  }

  const token = await createSession(secret);

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

