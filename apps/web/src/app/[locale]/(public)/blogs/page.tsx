import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { BlogsContent } from '@/widgets/public';

interface BlogsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function BlogsPage({ params }: BlogsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  return <BlogsContent />;
}
