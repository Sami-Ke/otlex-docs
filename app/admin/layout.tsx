import Link from 'next/link';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { ForceLightMode } from '@/components/admin/ForceLightMode';

export const metadata = {
  title: 'Admin - MDX Editor',
  description: 'Edit MDX documentation files',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get('session')?.value);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 強制 admin 區域使用 light mode */}
      <ForceLightMode />

      {/* 頂部導航 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-lg font-semibold text-gray-900"
              >
                MDX Editor
              </Link>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                Admin
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/docs"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                查看文件站 →
              </Link>
              {hasSession && (
                <form action="/api/admin/auth/logout" method="post">
                  <button
                    type="submit"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    登出
                  </button>
                </form>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
