import { SignJWT, jwtVerify } from 'jose';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Padded(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder === 0) return normalized;
  return `${normalized}${'='.repeat(4 - remainder)}`;
}

function fromBase64(value: string): Uint8Array {
  const normalized = toBase64Padded(value);
  const binary = typeof atob === 'function'
    ? atob(normalized)
    : Buffer.from(normalized, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length === b.length ? 0 : 1;
  const maxLength = Math.max(a.length, b.length);
  for (let i = 0; i < maxLength; i += 1) {
    const aByte = i < a.length ? a[i] : 0;
    const bByte = i < b.length ? b[i] : 0;
    diff |= aByte ^ bByte;
  }
  return diff === 0;
}

/**
 * SHA-256（Web Crypto API）
 * - 僅供舊版 ADMIN_PASSWORD_HASH 相容
 * - 新部署請改用 pbkdf2_sha256 格式（verifyPassword 支援）
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

async function verifyPbkdf2Password(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, roundsRaw, saltRaw, expectedRaw] = storedHash.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !roundsRaw || !saltRaw || !expectedRaw) {
    return false;
  }

  const rounds = Number.parseInt(roundsRaw, 10);
  if (!Number.isFinite(rounds) || rounds < 100_000 || rounds > 5_000_000) {
    return false;
  }

  const salt = Uint8Array.from(fromBase64(saltRaw));
  const expected = Uint8Array.from(fromBase64(expectedRaw));
  if (salt.length < 16 || expected.length < 32) {
    return false;
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: rounds,
      hash: 'SHA-256',
    },
    keyMaterial,
    expected.length * 8,
  );

  return timingSafeEqual(new Uint8Array(derivedBits), expected);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2_sha256$')) {
    return verifyPbkdf2Password(password, storedHash);
  }

  const providedHash = (await hashPassword(password)).toLowerCase();
  return timingSafeEqual(
    new TextEncoder().encode(providedHash),
    new TextEncoder().encode(storedHash.toLowerCase()),
  );
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
