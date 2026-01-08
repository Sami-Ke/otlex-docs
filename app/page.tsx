import Link from 'next/link';

const categories = [
  {
    title: '入門指南',
    description: '快速上手 Otlex SEO Tool',
    href: '/docs/getting-started',
    icon: '🚀',
  },
  {
    title: 'SEO 審核',
    description: '了解 SEO Audit 功能與評分',
    href: '/docs/seo-audit',
    icon: '📊',
  },
  {
    title: 'AI 內容生成',
    description: '使用 AI 產生高品質內容',
    href: '/docs/ai-content',
    icon: '✨',
  },
  {
    title: '內容地圖',
    description: '視覺化你的內容策略',
    href: '/docs/content-map',
    icon: '🗺️',
  },
  {
    title: '整合設定',
    description: '連接 GSC、GA4 等服務',
    href: '/docs/integrations',
    icon: '🔗',
  },
  {
    title: '帳號與計費',
    description: '管理訂閱與帳號設定',
    href: '/docs/account-billing',
    icon: '💳',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Otlex Help Center
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            找到你需要的答案，快速上手 SEO Tool
          </p>

          {/* Search */}
          <div className="mt-8 max-w-xl mx-auto">
            <Link
              href="/docs"
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              搜尋文件...
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-3">{category.icon}</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {category.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {category.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            找不到答案？
            <a
              href="mailto:support@otlex.com"
              className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              聯繫支援團隊
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
