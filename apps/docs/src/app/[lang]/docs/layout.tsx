import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  const tree = source.pageTree[lang];
  if (!tree) notFound();
  return (
    <DocsLayout tree={tree} {...baseOptions(lang)}>
      {children}
    </DocsLayout>
  );
}
