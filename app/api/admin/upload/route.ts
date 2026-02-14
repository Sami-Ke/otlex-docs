import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
};

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function buildPublicUrl(base: string, key: string): string {
  try {
    // Ensure base is treated as a directory URL
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return new URL(key, normalized).toString();
  } catch {
    return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
  }
}

/**
 * POST /api/admin/upload
 * 接收 multipart/form-data 的 image 檔案並上傳到 Cloudflare R2。
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });

  const bucket = (env as unknown as { DOCS_IMAGES?: R2BucketLike }).DOCS_IMAGES;
  if (!bucket) {
    return NextResponse.json(
      { error: 'R2 bucket binding DOCS_IMAGES is not available' },
      { status: 500 }
    );
  }

  const publicBaseUrl =
    (env as unknown as { R2_PUBLIC_URL?: string }).R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL;
  if (!publicBaseUrl) {
    return NextResponse.json(
      { error: 'Missing R2_PUBLIC_URL' },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart/form-data' },
      { status: 400 }
    );
  }

  const file = form.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Field "image" is required' },
      { status: 400 }
    );
  }

  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 5MB)' },
      { status: 400 }
    );
  }

  const key = `${Date.now()}-${randomHex(8)}.${ext}`;
  const data = await file.arrayBuffer();

  await bucket.put(key, data, {
    httpMetadata: { contentType: file.type },
  });

  const url = buildPublicUrl(publicBaseUrl, key);
  return NextResponse.json({ url });
}

