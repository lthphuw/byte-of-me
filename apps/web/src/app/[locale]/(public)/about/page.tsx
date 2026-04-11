import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { AboutContent } from '@/widgets/about-content/ui';
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
