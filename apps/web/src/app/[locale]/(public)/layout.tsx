import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { PublicSiteFooter } from '@/widgets/public-site-footer/ui';
import { PublicSiteHeader } from '@/widgets/public-site-header/ui/public-site-header';

interface PublicLayoutProps {
  children?: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: PublicLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as LocaleType);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <PublicSiteHeader />
      <div className="container grid flex-1 gap-12">
        <main className="flex w-full flex-1 flex-col">{children}</main>
      </div>
      <PublicSiteFooter />
    </div>
  );
}
