import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { LocaleType } from '@/shared/types';
import { PublicSiteFooter } from '@/widgets/public-site-footer/ui';
import { PublicSiteHeader } from '@/widgets/public-site-header/ui/public-site-header';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

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
    <div className="flex relative min-h-screen flex-col overflow-hidden">
      <PublicSiteHeader />
      <div className="container grid flex-1 gap-12">
        <main className="flex w-full flex-1 flex-col">{children}</main>
      </div>
      <PublicSiteFooter />
    </div>
  );
}
