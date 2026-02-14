'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const next = searchParams.get('next');
    return next && next.startsWith('/admin') ? next : '/admin';
  }, [searchParams]);

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('密碼錯誤');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('登入失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold">管理員登入</h1>
        <p className="mt-1 text-sm opacity-80">
          請輸入管理員密碼以進入後台。
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium" htmlFor="password">
            密碼
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            disabled={submitting}
            required
          />

          {error && (
            <div className="text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded border px-3 py-2 text-sm font-medium"
            disabled={submitting}
          >
            {submitting ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
