import { MotionProvider } from '@byte-of-me/ui';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { PublicSiteFooter, PublicSiteHeader } from '@/widgets/public';

export const dynamic = 'force-static';

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
    <MotionProvider>
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <PublicSiteHeader />
        <div className="container grid min-w-0 flex-1 gap-12">
          {/* min-w-0: as a grid item, <main> must be allowed to shrink below its
              content's min-content, otherwise wide children (e.g. blog code
              blocks) force it past the viewport on mobile. */}
          <main className="flex w-full min-w-0 flex-1 flex-col">{children}</main>
        </div>
        <PublicSiteFooter />
      </div>
    </MotionProvider>
  );
}
