import { NextResponse } from 'next/server';
import { listMdxFiles } from '@/lib/mdx-utils';
import type { MdxListResponse, ApiErrorResponse } from '@/types/admin';

/**
 * GET /api/mdx
 * 列出所有 MDX 檔案
 */
export async function GET(): Promise<NextResponse<MdxListResponse | ApiErrorResponse>> {
  // Dev-only 檢查
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin API is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const files = await listMdxFiles();
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
