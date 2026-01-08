import 'fumadocs-ui/style.css';
import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  title: {
    default: 'Otlex Help Center',
    template: '%s | Otlex Help Center',
  },
  description: 'Otlex SEO Tool 使用說明與教學文件',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
