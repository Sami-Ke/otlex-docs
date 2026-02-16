import matter from 'gray-matter';
import type { MdxFileInfo, MdxFrontmatter } from '@/types/admin';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';

type GithubRepoRef = { owner: string; repo: string };

interface GithubTreeResponse {
  tree: Array<{
    path: string;
    type: 'blob' | 'tree' | string;
  }>;
}

interface GithubContentsResponse {
  sha: string;
  encoding: 'base64' | string;
  content?: string;
}

interface GithubCommitListItem {
  commit?: {
    committer?: {
      date?: string;
    };
  };
}

export interface GithubMdxFile {
  slug: string;
  content: string;
  frontmatter: MdxFrontmatter;
  sha: string;
}

export interface GithubWriteResult {
  success: boolean;
  message: string;
  sha?: string;
}

class GithubApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GithubApiError';
    this.status = status;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getRepoRef(): GithubRepoRef {
  const raw = requireEnv('GITHUB_REPO').trim();
  const [owner, repo] = raw.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPO (expected "owner/repo"): ${raw}`);
  }
  return { owner, repo };
}

function getBranch(): string {
  return (process.env.GITHUB_BRANCH || DEFAULT_BRANCH).trim();
}

function getDocsPath(): string {
  const raw = requireEnv('GITHUB_DOCS_PATH').trim();
  // Normalize to no leading/trailing slash for path prefix checks.
  return raw.replace(/^\/+/, '').replace(/\/+$/, '');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.includes('..') || slug.startsWith('/')) return false;
  return /^[a-zA-Z0-9\-_/]+$/.test(slug);
}

function slugToRepoPath(slug: string): string {
  const docsPath = getDocsPath();
  return `${docsPath}/${slug}.mdx`;
}

function utf8ToBase64(value: string): string {
  // Prefer Web APIs (Cloudflare Workers / Edge Runtime).
  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  // Fallback for environments with Buffer.
   
  const BufferCtor = (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer;
  if (BufferCtor) return BufferCtor.from(value, 'utf-8').toString('base64');

  throw new Error('No base64 encoder available in this runtime');
}

function base64ToUtf8(value: string): string {
  // GitHub often inserts newlines in the base64 payload.
  const cleaned = value.replace(/\s/g, '');
  if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

   
  const BufferCtor = (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer;
  if (BufferCtor) return BufferCtor.from(cleaned, 'base64').toString('utf-8');

  throw new Error('No base64 decoder available in this runtime');
}

async function githubRequest<T>(
  method: 'GET' | 'PUT',
  url: string,
  body?: unknown
): Promise<T> {
  const token = requireEnv('GITHUB_TOKEN');

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'otlex-docs-admin',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `GitHub API error (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = `${message}: ${data.message}`;
    } catch {
      // ignore
    }
    throw new GithubApiError(res.status, message);
  }

  return (await res.json()) as T;
}

async function getFileContentsByPath(repoPath: string): Promise<{ sha: string; content: string }> {
  const { owner, repo } = getRepoRef();
  const branch = getBranch();

  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/contents/${encodePath(repoPath)}?ref=${encodeURIComponent(
    branch
  )}`;

  const data = await githubRequest<GithubContentsResponse>('GET', url);

  if (data.encoding !== 'base64' || !data.content) {
    throw new Error(`Unexpected GitHub contents response for: ${repoPath}`);
  }

  return { sha: data.sha, content: base64ToUtf8(data.content) };
}

async function getLastCommitDateByPath(repoPath: string): Promise<string | null> {
  const { owner, repo } = getRepoRef();
  const branch = getBranch();

  const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(
    repoPath
  )}&sha=${encodeURIComponent(branch)}&per_page=1`;

  const list = await githubRequest<GithubCommitListItem[]>('GET', url);
  const date = list?.[0]?.commit?.committer?.date;
  return typeof date === 'string' && date ? date : null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function listMdxFiles(): Promise<MdxFileInfo[]> {
  const { owner, repo } = getRepoRef();
  const branch = getBranch();
  const docsPath = getDocsPath();

  const treeUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
    branch
  )}?recursive=1`;

  const tree = await githubRequest<GithubTreeResponse>('GET', treeUrl);

  const mdxPaths = tree.tree
    .filter((item) => item.type === 'blob')
    .map((item) => item.path)
    .filter((p) => p.startsWith(`${docsPath}/`) && p.endsWith('.mdx'));

  const nowIso = new Date().toISOString();
  const shouldUseCommitDate = mdxPaths.length > 0 && mdxPaths.length <= 50;

  const fileInfos = await mapWithConcurrency(mdxPaths, 5, async (repoPath) => {
    try {
      const slug = repoPath.slice(`${docsPath}/`.length).replace(/\.mdx$/, '');
      const { content } = await getFileContentsByPath(repoPath);
      const { data } = matter(content);

      const lastModified =
        shouldUseCommitDate ? (await getLastCommitDateByPath(repoPath)) ?? nowIso : nowIso;

      return {
        slug,
        title: (data as Partial<MdxFrontmatter>).title || 'Untitled',
        description: (data as Partial<MdxFrontmatter>).description || '',
        lastModified,
      } satisfies MdxFileInfo;
    } catch {
      return null;
    }
  });

  const files = fileInfos.filter((f): f is MdxFileInfo => Boolean(f));
  files.sort((a, b) => a.slug.localeCompare(b.slug));
  return files;
}

export async function readMdxFile(slug: string): Promise<GithubMdxFile | null> {
  if (!isValidSlug(slug)) return null;

  const repoPath = slugToRepoPath(slug);

  try {
    const { sha, content } = await getFileContentsByPath(repoPath);
    const { data } = matter(content);

    return {
      slug,
      content,
      frontmatter: {
        title: (data as Partial<MdxFrontmatter>).title || '',
        description: (data as Partial<MdxFrontmatter>).description || '',
      },
      sha,
    };
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) return null;
    throw error;
  }
}

export async function writeMdxFile(
  slug: string,
  content: string,
  commitMessage: string,
  sha?: string
): Promise<GithubWriteResult> {
  if (!isValidSlug(slug)) {
    return { success: false, message: 'Invalid slug' };
  }

  try {
    const { data } = matter(content);
    if (!(data as Partial<MdxFrontmatter>).title) {
      return { success: false, message: 'Frontmatter must include a title' };
    }
  } catch {
    return { success: false, message: 'Invalid frontmatter format' };
  }

  const { owner, repo } = getRepoRef();
  const branch = getBranch();
  const repoPath = slugToRepoPath(slug);

  let currentSha = sha;
  if (!currentSha) {
    try {
      const existing = await getFileContentsByPath(repoPath);
      currentSha = existing.sha;
    } catch (error) {
      if (!(error instanceof GithubApiError && error.status === 404)) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to read current file SHA',
        };
      }
      currentSha = undefined; // Creating a new file.
    }
  }

  const putUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/contents/${encodePath(repoPath)}`;

  try {
    const payload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: commitMessage,
      content: utf8ToBase64(content),
      branch,
    };

    if (currentSha) payload.sha = currentSha;

    const res = await githubRequest<{ content?: { sha?: string } }>('PUT', putUrl, payload);

    return {
      success: true,
      message: 'File saved successfully',
      sha: res?.content?.sha,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save file',
    };
  }
}
