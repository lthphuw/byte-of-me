import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/shared/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.about');

  return buildPublicPageMetadata({
    segment: 'about',
    locale,
    title: t('title'),
    description: t('description'),
    keywords: ['Về bản thân tôi', 'Giới thiệu', 'About Me'],
  });
}

interface AboutLayoutProps {
  children?: React.ReactNode;
}

export default async function AboutLayout({ children }: AboutLayoutProps) {
  return <>{children}</>;
}
