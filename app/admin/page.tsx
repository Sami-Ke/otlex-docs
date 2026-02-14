'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MdxFileInfo, MdxListResponse } from '@/types/admin';

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupFilesByDirectory(files: MdxFileInfo[]): Record<string, MdxFileInfo[]> {
  const groups: Record<string, MdxFileInfo[]> = {};

  for (const file of files) {
    const parts = file.slug.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';

    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(file);
  }

  return groups;
}

// eslint-disable-next-line max-lines-per-function
export default function AdminPage() {
  const [files, setFiles] = useState<MdxFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch('/api/admin/mdx');
        if (!res.ok) {
          throw new Error('Failed to fetch files');
        }
        const data: MdxListResponse = await res.json();
        setFiles(data.files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  // 過濾檔案
  const filteredFiles = files.filter(
    (file) =>
      file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFiles = groupFilesByDirectory(filteredFiles);
  const directories = Object.keys(groupedFiles).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">錯誤: {error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* 頁面標題和搜尋 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            文件列表
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 {files.length} 個 MDX 檔案
          </p>
        </div>
        <div className="w-64">
          <input
            type="text"
            placeholder="搜尋檔案..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 檔案列表（按目錄分組） */}
      <div className="space-y-6">
        {directories.map((dir) => (
          <div
            key={dir}
            className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden"
          >
            {/* 目錄標題 */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {dir === '(root)' ? '根目錄' : `📁 ${dir}`}
              </h2>
            </div>

            {/* 檔案列表 */}
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {groupedFiles[dir].map((file) => (
                <li key={file.slug}>
                  <Link
                    href={`/admin/editor/${encodeURIComponent(file.slug)}`}
                    className="block px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {file.description || '(無描述)'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {file.slug}.mdx
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(file.lastModified)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? '找不到符合的檔案' : '沒有 MDX 檔案'}
          </p>
        </div>
      )}
    </div>
  );
}
