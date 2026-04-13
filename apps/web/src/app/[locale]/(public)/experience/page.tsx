import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { ExperienceContent } from '@/widgets/public/experience-content/ui/experience-content';

interface ExperiencesPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ExperiencesPage({
  params,
}: ExperiencesPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <ExperienceContent />;
}
