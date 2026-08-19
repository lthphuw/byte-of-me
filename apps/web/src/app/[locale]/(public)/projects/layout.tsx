import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/shared/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.projects');

  return buildPublicPageMetadata({
    segment: 'projects',
    locale,
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
  });
}

interface ProjectsLayoutProps {
  children?: React.ReactNode;
}

export default async function ProjectsLayout({ children }: ProjectsLayoutProps) {
  return <>{children}</>;
}
