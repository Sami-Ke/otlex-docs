import { NextRequest } from 'next/server';

interface ThrottleState {
  attempts: number;
  windowStartedAt: number;
  lockedUntil: number;
  lastSeenAt: number;
}

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 200;
const RETAIN_ENTRY_MS = 2 * LOGIN_LOCKOUT_MS;

const throttleStore = new Map<string, ThrottleState>();
let writeCount = 0;

function maybeCleanup(now: number) {
  writeCount += 1;
  if (writeCount % CLEANUP_INTERVAL !== 0) return;

  for (const [key, state] of throttleStore.entries()) {
    if (now - state.lastSeenAt > RETAIN_ENTRY_MS && now > state.lockedUntil) {
      throttleStore.delete(key);
    }
  }
}

function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  return 'unknown';
}

export function getLoginThrottleKey(request: NextRequest): string {
  const ip = extractClientIp(request);
  const userAgent = request.headers.get('user-agent')?.slice(0, 120) ?? 'unknown';
  return `${ip}|${userAgent}`;
}

export function checkLoginThrottle(key: string): { blocked: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = throttleStore.get(key);
  if (!current) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  current.lastSeenAt = now;
  maybeCleanup(now);

  if (current.lockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.lockedUntil - now) / 1000)),
    };
  }

  if (now - current.windowStartedAt > LOGIN_WINDOW_MS) {
    throttleStore.set(key, {
      attempts: 0,
      windowStartedAt: now,
      lockedUntil: 0,
      lastSeenAt: now,
    });
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string): { blocked: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = throttleStore.get(key);

  let next: ThrottleState;
  if (!existing || now - existing.windowStartedAt > LOGIN_WINDOW_MS) {
    next = {
      attempts: 1,
      windowStartedAt: now,
      lockedUntil: 0,
      lastSeenAt: now,
    };
  } else {
    next = {
      attempts: existing.attempts + 1,
      windowStartedAt: existing.windowStartedAt,
      lockedUntil: existing.lockedUntil,
      lastSeenAt: now,
    };
  }

  if (next.attempts >= LOGIN_MAX_ATTEMPTS) {
    next.lockedUntil = now + LOGIN_LOCKOUT_MS;
    throttleStore.set(key, next);
    maybeCleanup(now);
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(LOGIN_LOCKOUT_MS / 1000),
    };
  }

  throttleStore.set(key, next);
  maybeCleanup(now);
  return { blocked: false, retryAfterSeconds: 0 };
}

export function clearLoginFailures(key: string) {
  throttleStore.delete(key);
}
