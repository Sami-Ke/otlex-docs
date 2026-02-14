import { NextRequest, NextResponse } from 'next/server';
import { readMdxFile, writeMdxFile } from '@/lib/github';
import type {
  ApiErrorResponse,
  MdxFileResponse,
  MdxWriteResponse,
} from '@/types/admin';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/admin/mdx/[slug]
 * 讀取單一 MDX 檔案（GitHub）
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MdxFileResponse | ApiErrorResponse>> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  try {
    const file = await readMdxFile(decodedSlug);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or invalid slug' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      slug: file.slug,
      content: file.content,
      frontmatter: file.frontmatter,
      sha: file.sha,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/mdx/[slug]
 * 寫入/更新 MDX 檔案（GitHub）
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MdxWriteResponse | ApiErrorResponse>> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let body: { content?: string; sha?: string; commitMessage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'Content is required and must be a string' },
      { status: 400 }
    );
  }

  const commitMessage =
    typeof body.commitMessage === 'string' && body.commitMessage.trim()
      ? body.commitMessage.trim()
      : `docs: update ${decodedSlug}.mdx`;

  const result = await writeMdxFile(decodedSlug, body.content, commitMessage, body.sha);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    sha: result.sha,
  });
}

