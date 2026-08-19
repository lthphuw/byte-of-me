import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPublicPageMetadata } from '@/shared/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('metadata.contact');

  return buildPublicPageMetadata({
    segment: 'contact',
    locale,
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
  });
}

interface ContactLayoutProps {
  children?: React.ReactNode;
}

export default async function ContactLayout({ children }: ContactLayoutProps) {
  return <>{children}</>;
}
