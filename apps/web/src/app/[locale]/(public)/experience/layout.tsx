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

  return {
    ...buildPublicPageMetadata({
      segment: 'experience',
      locale,
      title: t('title'),
      description: t('description'),
      keywords: t('keywords'),
    }),
    // The page body redirects to the homepage, so this URL answers 200 with a
    // `meta refresh` and no content. Without `noindex` Google indexes that empty
    // shell under the title "Experience". Drop this block when the page returns.
    robots: { index: false, follow: true },
  };
}

interface ExperienceLayoutProps {
  children?: React.ReactNode;
}

export default async function ExperienceLayout({ children }: ExperienceLayoutProps) {
  return <>{children}</>;
}
