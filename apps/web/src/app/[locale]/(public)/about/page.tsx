import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { AboutContent } from '@/widgets/public';

import { setRequestLocale } from 'next-intl/server';

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <AboutContent />;
}
