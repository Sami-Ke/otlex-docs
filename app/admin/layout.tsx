import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Admin - MDX Editor',
  description: 'Edit MDX documentation files',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side dev-only 檢查
  if (process.env.NODE_ENV !== 'development') {
    redirect('/docs');
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* 頂部導航 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                MDX Editor
              </Link>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                Dev Only
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/docs"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                查看文件站 →
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
