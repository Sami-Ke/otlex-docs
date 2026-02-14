'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { MdxFileResponse } from '@/types/admin';

// 動態載入 MDXEditor（不支援 SSR）
const MdxEditorComponent = dynamic(
  () => import('@/components/admin/MdxEditor').then((mod) => mod.MdxEditorComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">載入編輯器中...</div>
      </div>
    ),
  }
);

// eslint-disable-next-line max-lines-per-function
export default function EditorPage() {
  const params = useParams();
  const router = useRouter();

  // 從 URL 取得 slug（可能是陣列或字串）
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam || '';

  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [sha, setSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 載入檔案內容
  useEffect(() => {
    if (!slug) {
      setError('No file specified');
      setLoading(false);
      return;
    }

    async function fetchFile() {
      try {
        const res = await fetch(`/api/admin/mdx/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('File not found');
          }
          throw new Error('Failed to fetch file');
        }
        const data: MdxFileResponse = await res.json();
        setContent(data.content);
        setTitle(data.frontmatter.title);
        setSha(data.sha ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchFile();
  }, [slug]);

  // 儲存檔案
  const handleSave = useCallback(
    async (newContent: string) => {
      setIsSaving(true);
      setSaveMessage(null);

      try {
        const res = await fetch(`/api/admin/mdx/${encodeURIComponent(slug)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newContent, sha }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to save file');
        }

        if (typeof data?.sha === 'string' && data.sha) {
          setSha(data.sha);
        }

        setSaveMessage({ type: 'success', text: '儲存成功！' });

        // 3 秒後清除訊息
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (err) {
        setSaveMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [sha, slug]
  );

  // 離開前確認
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // 這裡可以加入更精確的「有未儲存變更」檢查
      // 目前簡化處理
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-500">錯誤: {error}</div>
        <button
          onClick={() => router.push('/admin')}
          className="text-blue-600 hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* 頂部麵包屑 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            文件列表
          </Link>
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {title || slug}
          </span>
        </div>

        {/* 儲存訊息 */}
        {saveMessage && (
          <div
            className={`text-sm px-3 py-1 rounded ${
              saveMessage.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {saveMessage.text}
          </div>
        )}
      </div>

      {/* 編輯器 */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {content !== null && (
          <MdxEditorComponent
            initialContent={content}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
