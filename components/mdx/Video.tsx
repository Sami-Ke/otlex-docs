import type { ReactElement } from 'react';

type Provider = 'youtube' | 'vimeo';

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function firstPathSegment(pathname: string): string {
  return pathname.replace(/^\/+/, '').split('/')[0] ?? '';
}

function parseYouTubeUrl(url: URL, host: string): { provider: Provider; id: string } | null {
  if (host === 'youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? { provider: 'youtube', id } : null;
    }

    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)$/);
    return embedMatch?.[1] ? { provider: 'youtube', id: embedMatch[1] } : null;
  }

  if (host === 'youtu.be') {
    const id = firstPathSegment(url.pathname);
    return id ? { provider: 'youtube', id } : null;
  }

  return null;
}

function parseVimeoUrl(url: URL, host: string): { provider: Provider; id: string } | null {
  if (host === 'vimeo.com') {
    const id = firstPathSegment(url.pathname);
    return id && /^\d+$/.test(id) ? { provider: 'vimeo', id } : null;
  }

  if (host === 'player.vimeo.com') {
    const match = url.pathname.match(/^\/video\/(\d+)$/);
    return match?.[1] ? { provider: 'vimeo', id: match[1] } : null;
  }

  return null;
}

function parseVideoUrl(input: string): { provider: Provider; id: string } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const host = normalizeHost(url.hostname);
  return parseYouTubeUrl(url, host) ?? parseVimeoUrl(url, host);
}

function buildEmbedSrc(provider: Provider, id: string): string {
  if (provider === 'youtube') {
    const u = new URL(`https://www.youtube.com/embed/${id}`);
    u.searchParams.set('rel', '0');
    return u.toString();
  }

  return `https://player.vimeo.com/video/${id}`;
}

export function Video({ url }: { url: string }): ReactElement {
  const parsed = parseVideoUrl(url);

  if (!parsed) {
    return (
      <div role="alert" className="text-sm">
        無效的影片 URL（僅支援 YouTube / Vimeo）
      </div>
    );
  }

  const src = buildEmbedSrc(parsed.provider, parsed.id);
  const title = parsed.provider === 'youtube' ? 'YouTube video' : 'Vimeo video';

  return (
    <div className="relative w-full aspect-video">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
