import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/shared/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.experience');

  return buildPublicPageMetadata({
    segment: 'experience',
    locale,
    title: t('title'),
    description: t('description'),
    keywords: [
      'Kinh nghiệm',
      'Việc làm',
      'Kinh nghiệm việc làm',
      'Experience',
    ],
  });
}

interface ExperienceLayoutProps {
  children?: React.ReactNode;
}

export default async function ExperienceLayout({ children }: ExperienceLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}
