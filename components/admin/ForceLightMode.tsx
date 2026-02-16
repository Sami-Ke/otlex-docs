'use client';

import { useEffect } from 'react';

/**
 * 在 admin 頁面強制使用 light mode。
 * 使用 MutationObserver 持續攔截 next-themes / fumadocs RootProvider
 * 加回的 dark class，確保 admin 區域始終為 light mode。
 */
export function ForceLightMode() {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    const prevStyle = html.style.colorScheme;

    function forceLight() {
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
      }
      if (html.style.colorScheme !== 'light') {
        html.style.colorScheme = 'light';
      }
    }

    // 立即套用
    forceLight();

    // 持續監控：攔截 next-themes 加回 dark class
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          forceLight();
        }
      }
    });

    observer.observe(html, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      observer.disconnect();
      // 離開 admin 時恢復
      if (hadDark) {
        html.classList.add('dark');
      }
      html.style.colorScheme = prevStyle;
    };
  }, []);

  return null;
}
