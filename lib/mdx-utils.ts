import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { MdxFileInfo, MdxFileContent, MdxFrontmatter } from '@/types/admin';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

/**
 * 驗證 slug 是否安全（防止 path traversal 攻擊）
 */
export function isValidSlug(slug: string): boolean {
  // 不允許空字串
  if (!slug) return false;
  // 不允許包含 .. 或以 / 開頭
  if (slug.includes('..') || slug.startsWith('/')) return false;
  // 只允許字母、數字、連字號、底線和斜線
  if (!/^[a-zA-Z0-9\-_/]+$/.test(slug)) return false;
  return true;
}

/**
 * 將 slug 轉換為檔案路徑
 */
export function slugToFilePath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

/**
 * 將檔案路徑轉換為 slug
 */
export function filePathToSlug(filePath: string): string {
  const relativePath = path.relative(CONTENT_DIR, filePath);
  return relativePath.replace(/\.mdx$/, '').replace(/\\/g, '/');
}

/**
 * 遞迴列出所有 MDX 檔案
 */
export async function listMdxFiles(): Promise<MdxFileInfo[]> {
  const files: MdxFileInfo[] = [];

  async function scanDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.mdx')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const { data } = matter(content);
          const stats = await fs.stat(fullPath);

          files.push({
            slug: filePathToSlug(fullPath),
            title: (data as MdxFrontmatter).title || 'Untitled',
            description: (data as MdxFrontmatter).description || '',
            lastModified: stats.mtime.toISOString(),
          });
        } catch {
          // 跳過無法讀取的檔案
        }
      }
    }
  }

  await scanDir(CONTENT_DIR);

  // 按 slug 排序
  files.sort((a, b) => a.slug.localeCompare(b.slug));

  return files;
}

/**
 * 讀取單一 MDX 檔案
 */
export async function readMdxFile(slug: string): Promise<MdxFileContent | null> {
  if (!isValidSlug(slug)) {
    return null;
  }

  const filePath = slugToFilePath(slug);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);

    return {
      slug,
      content,
      frontmatter: {
        title: (data as MdxFrontmatter).title || '',
        description: (data as MdxFrontmatter).description || '',
      },
    };
  } catch {
    return null;
  }
}

/**
 * 寫入 MDX 檔案
 */
export async function writeMdxFile(
  slug: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  if (!isValidSlug(slug)) {
    return { success: false, message: 'Invalid slug' };
  }

  // 驗證內容格式（必須有有效的 frontmatter）
  try {
    const { data } = matter(content);
    if (!data.title) {
      return { success: false, message: 'Frontmatter must include a title' };
    }
  } catch {
    return { success: false, message: 'Invalid frontmatter format' };
  }

  const filePath = slugToFilePath(slug);

  try {
    // 確保目錄存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, message: 'File saved successfully' };
  } catch (error) {
    return {
      success: false,
      message: `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * 將檔案按目錄分組
 */
export function groupFilesByDirectory(files: MdxFileInfo[]): Record<string, MdxFileInfo[]> {
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
