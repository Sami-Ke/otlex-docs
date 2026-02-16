'use client';

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import '@mdxeditor/editor/style.css';
import './mdx-editor-overrides.css';
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
  codeMirrorPlugin,
  // Frontmatter
  frontmatterPlugin,
  // 工具列
  toolbarPlugin,
  // Diff/Source 模式
  diffSourcePlugin,
  // JSX 支援
  jsxPlugin,
  type JsxComponentDescriptor,
  GenericJsxEditor,
  // 工具列元件
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ButtonWithTooltip,
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

function InsertVideoButton({ editorRef }: { editorRef: RefObject<MDXEditorMethods | null> }) {
  const handleInsertVideo = useCallback(() => {
    const input = window.prompt('請輸入 YouTube / Vimeo 影片 URL');
    const url = input?.trim();
    if (!url) return;
    if (url.includes('"')) {
      // 直接避免破壞 JSX attribute；如有需要可改成更完整的 escape/encode。
      window.alert('URL 不能包含雙引號 (")');
      return;
    }

    const snippet = `\n<Video url="${url}" />\n`;
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus(() => {
      editor.insertMarkdown(snippet);
    });
  }, [editorRef]);

  return (
    <ButtonWithTooltip title="插入影片 (YouTube / Vimeo)" onClick={handleInsertVideo}>
      <span className="text-xs">Video</span>
    </ButtonWithTooltip>
  );
}

/** codeMirrorPlugin 語言對照表（涵蓋 repo 內 MDX 實際使用的語言） */
const codeBlockLanguages: Record<string, string> = {
  '': 'Plain',
  text: 'Text',
  txt: 'Text',
  json: 'JSON',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  nginx: 'Nginx',
  apache: 'Apache',
  ts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  jsx: 'JSX',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  bash: 'Bash',
  sh: 'Shell',
  sql: 'SQL',
  python: 'Python',
  yaml: 'YAML',
  markdown: 'Markdown',
};

/** Fumadocs / 自訂 MDX 元件描述（讓編輯器認識 JSX） */
const jsxComponentDescriptors: JsxComponentDescriptor[] = [
  {
    name: 'Callout',
    kind: 'flow',
    hasChildren: true,
    props: [{ name: 'type', type: 'string' }, { name: 'title', type: 'string' }],
    Editor: GenericJsxEditor,
  },
  {
    name: 'Card',
    kind: 'flow',
    hasChildren: false,
    props: [{ name: 'title', type: 'string' }, { name: 'href', type: 'string' }, { name: 'icon', type: 'string' }],
    Editor: GenericJsxEditor,
  },
  {
    name: 'Cards',
    kind: 'flow',
    hasChildren: true,
    props: [],
    Editor: GenericJsxEditor,
  },
  {
    name: 'Steps',
    kind: 'flow',
    hasChildren: true,
    props: [],
    Editor: GenericJsxEditor,
  },
  {
    name: 'Step',
    kind: 'flow',
    hasChildren: true,
    props: [{ name: 'title', type: 'string' }],
    Editor: GenericJsxEditor,
  },
  {
    name: 'Video',
    kind: 'flow',
    hasChildren: false,
    props: [{ name: 'url', type: 'string' }],
    Editor: GenericJsxEditor,
  },
];

/** 為沒有語言標記的 code block 補上 `text`，避免 rich-text 模式解析失敗 */
function preprocessMarkdown(markdown: string): string {
  let inCodeBlock = false;
  let fenceChar = '';
  let fenceCount = 0;

  return markdown.split('\n').map(line => {
    const trimmed = line.trimEnd();

    if (inCodeBlock) {
      const closeMatch = trimmed.match(/^(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceCount) {
        inCodeBlock = false;
      }
      return line;
    }

    // 開啟 fence 但沒有語言 → 補上 text
    const openNoLang = trimmed.match(/^(`{3,}|~{3,})\s*$/);
    if (openNoLang) {
      inCodeBlock = true;
      fenceChar = openNoLang[1][0];
      fenceCount = openNoLang[1].length;
      return openNoLang[1] + 'text';
    }

    // 開啟 fence 且有語言
    const openWithLang = trimmed.match(/^(`{3,}|~{3,})\S/);
    if (openWithLang) {
      inCodeBlock = true;
      fenceChar = openWithLang[1][0];
      fenceCount = openWithLang[1].length;
    }

    return line;
  }).join('\n');
}

// eslint-disable-next-line max-lines-per-function
export function MdxEditorComponent({ initialContent, onSave, isSaving }: MdxEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const processedContent = useMemo(() => preprocessMarkdown(initialContent), [initialContent]);

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
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600">
              有未儲存的變更
            </span>
          )}
          {!hasChanges && (
            <span className="text-sm text-gray-500">
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
          markdown={processedContent}
          onChange={handleChange}
          onError={() => {/* 抑制 rich-text 解析警告，source 模式不受影響 */}}
          contentEditableClassName="prose prose-sm sm:prose lg:prose-lg max-w-none p-4 min-h-[500px] focus:outline-none"
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

            // 圖片：支援 URL + 上傳（上傳走 /api/admin/upload）
            imagePlugin({
              imageUploadHandler: async (file: File) => {
                const formData = new FormData();
                formData.append('image', file);

                const res = await fetch('/api/admin/upload', {
                  method: 'POST',
                  body: formData,
                });

                let data: unknown = null;
                try {
                  data = await res.json();
                } catch {
                  // ignore
                }

                if (!res.ok) {
                  const errMsg =
                    typeof data === 'object' && data && 'error' in data
                      ? String((data as { error: unknown }).error)
                      : 'Upload failed';
                  throw new Error(errMsg);
                }

                const url =
                  typeof data === 'object' && data && 'url' in data
                    ? String((data as { url: unknown }).url)
                    : '';

                if (!url) {
                  throw new Error('Upload failed');
                }

                return url;
              },
              imageAutocompleteSuggestions: [],
            }),

            // 表格
            tablePlugin(),

            // 程式碼區塊（codeMirrorPlugin 提供 rich-text 模式的 CodeBlockEditorDescriptor）
            codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
            codeMirrorPlugin({ codeBlockLanguages }),

            // JSX 元件支援（Callout, Card, Cards, Steps, Step, Video）
            jsxPlugin({ jsxComponentDescriptors }),

            // Diff/Source 模式（預設 source，避免自訂 JSX 解析失敗）
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
                  <InsertVideoButton editorRef={editorRef} />
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
