import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/shared/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.blogs');

  return buildPublicPageMetadata({
    segment: 'blogs',
    locale,
    title: t('title'),
    description: t('description'),
    keywords: ['Bài viết', 'Blogs'],
  });
}

interface BlogsLayoutProps {
  children?: React.ReactNode;
}

export default async function BlogsLayout({ children }: BlogsLayoutProps) {
  return <>{children}</>;
}
