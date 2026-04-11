import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { BlogsContent } from '@/widgets/blogs-content/ui/blogs-content';
import { setRequestLocale } from 'next-intl/server';

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
