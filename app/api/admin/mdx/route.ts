import { NextResponse } from 'next/server';
import { listMdxFiles } from '@/lib/github';
import type { ApiErrorResponse, MdxListResponse } from '@/types/admin';

/**
 * GET /api/admin/mdx
 * 列出所有 MDX 檔案（資料來源：GitHub Contents/Tree API）
 */
export async function GET(): Promise<NextResponse<MdxListResponse | ApiErrorResponse>> {
  try {
    const files = await listMdxFiles();
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    );
  }
}

