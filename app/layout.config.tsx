import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Otlex Help Center',
  },
  links: [
    {
      text: '返回 App',
      url: 'https://app.otlex.com',
      active: 'nested-url',
    },
  ],
};
