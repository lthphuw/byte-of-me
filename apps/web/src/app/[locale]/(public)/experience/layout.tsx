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
    // next.config.js redirects this URL, so `noindex` only matters if that rule is
    // removed before the page body returns: then the empty shell must stay out.
    robots: { index: false, follow: true },
  };
}

interface ExperienceLayoutProps {
  children?: React.ReactNode;
}

export default async function ExperienceLayout({
  children,
}: ExperienceLayoutProps) {
  return <>{children}</>;
}
