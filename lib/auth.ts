import { SignJWT, jwtVerify } from 'jose';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256（Web Crypto API）
 * - 目的：Cloudflare Workers / Edge Runtime 可用（避免 Node.js crypto）
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

function getJwtKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * 建立 admin session JWT（7 天有效）
 */
export async function createSession(secret: string): Promise<string> {
  if (!secret) {
    throw new Error('Missing JWT secret');
  }

  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtKey(secret));
}

/**
 * 驗證 session JWT
 * - 回傳 payload（驗證失敗回傳 null）
 */
export async function verifySession(
  token: string,
  secret: string
): Promise<{ role?: string; sub?: string } | null> {
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtKey(secret), {
      algorithms: ['HS256'],
    });

    if (payload.sub !== 'admin') return null;
    if (payload.role !== 'admin') return null;

    return { role: payload.role as string | undefined, sub: payload.sub };
  } catch {
    return null;
  }
}

