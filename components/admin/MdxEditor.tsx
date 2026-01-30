'use client';

import { useCallback, useRef, useState } from 'react';
import '@mdxeditor/editor/style.css';
import {
  MDXEditor,
  type MDXEditorMethods,
  // 基礎格式
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  // 連結與媒體
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  // 表格
  tablePlugin,
  // 程式碼
  codeBlockPlugin,
  // Frontmatter
  frontmatterPlugin,
  // 工具列
  toolbarPlugin,
  // Diff/Source 模式
  diffSourcePlugin,
  // 工具列元件
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  DiffSourceToggleWrapper,
  Separator,
  InsertFrontmatter,
} from '@mdxeditor/editor';

interface MdxEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  isSaving?: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function MdxEditorComponent({ initialContent, onSave, isSaving }: MdxEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = useCallback(async () => {
    if (editorRef.current) {
      const content = editorRef.current.getMarkdown();
      await onSave(content);
      setHasChanges(false);
    }
  }, [onSave]);

  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  // 鍵盤快捷鍵：Ctrl/Cmd + S 儲存
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* 頂部狀態列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              有未儲存的變更
            </span>
          )}
          {!hasChanges && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已儲存
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? '儲存中...' : '儲存 (⌘S)'}
        </button>
      </div>

      {/* 編輯器區域 */}
      <div className="flex-1 overflow-auto">
        <MDXEditor
          ref={editorRef}
          markdown={initialContent}
          onChange={handleChange}
          contentEditableClassName="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none p-4 min-h-[500px] focus:outline-none"
          plugins={[
            // Frontmatter 編輯
            frontmatterPlugin(),

            // 基礎格式
            headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),

            // 連結
            linkPlugin(),
            linkDialogPlugin(),

            // 圖片（僅支援 URL，不實作上傳）
            imagePlugin({
              imageUploadHandler: async () => {
                // 提示使用者貼入 URL
                const url = window.prompt('請輸入圖片 URL:');
                return url || '';
              },
            }),

            // 表格
            tablePlugin(),

            // 程式碼區塊
            codeBlockPlugin({ defaultCodeBlockLanguage: 'typescript' }),

            // Diff/Source 模式
            diffSourcePlugin({
              viewMode: 'rich-text',
            }),

            // 工具列
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <Separator />
                  <InsertFrontmatter />
                  <Separator />
                  <DiffSourceToggleWrapper>
                    <span className="text-xs">Source</span>
                  </DiffSourceToggleWrapper>
                </>
              ),
            }),
          ]}
        />
      </div>
    </div>
  );
}
