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
    keywords: ['Các dự án đã làm', 'Dự án', 'Projects', 'Side Projects'],
  });
}

interface ProjectsLayoutProps {
  children?: React.ReactNode;
}

export default async function ProjectsLayout({ children }: ProjectsLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
