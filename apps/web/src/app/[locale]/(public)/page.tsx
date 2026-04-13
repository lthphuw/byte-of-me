import type { LocaleType } from '@/shared/types';
import { HomepageContent } from '@/widgets/public/homepage-content/ui';

import { setRequestLocale } from 'next-intl/server';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <HomepageContent />;
}
