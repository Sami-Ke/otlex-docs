import type React from 'react';
import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import type { TOCItemType } from 'fumadocs-core/toc';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Video } from '@/components/mdx/Video';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const data = page.data as unknown;
  const body = typeof data === 'object' && data !== null ? (data as { body?: unknown }).body : undefined;
  const toc = typeof data === 'object' && data !== null ? (data as { toc?: TOCItemType[] }).toc : undefined;

  if (typeof body !== 'function') notFound();
  const mdxComponents = {
    ...defaultMdxComponents,
    Video,
  } as typeof defaultMdxComponents & { Video: typeof Video };
  const MDX = body as React.ComponentType<{ components?: typeof mdxComponents }>;

  return (
    <DocsPage
      toc={toc}
      tableOfContent={{
        style: 'clerk',
      }}
      breadcrumb={{
        enabled: false,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
