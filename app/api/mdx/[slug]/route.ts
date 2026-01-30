import { NextRequest, NextResponse } from 'next/server';
import { readMdxFile, writeMdxFile } from '@/lib/mdx-utils';
import type { MdxFileResponse, MdxWriteResponse, ApiErrorResponse } from '@/types/admin';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/mdx/[slug]
 * 讀取單一 MDX 檔案
 * slug 使用 URL-encoded 路徑，如 "getting-started%2Fcreate-brand"
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MdxFileResponse | ApiErrorResponse>> {
  // Dev-only 檢查
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin API is only available in development mode' },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

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
  });
}

/**
 * PUT /api/mdx/[slug]
 * 寫入/更新 MDX 檔案
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MdxWriteResponse | ApiErrorResponse>> {
  // Dev-only 檢查
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin API is only available in development mode' },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'Content is required and must be a string' },
      { status: 400 }
    );
  }

  const result = await writeMdxFile(decodedSlug, body.content);

  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: result.message,
  });
}
