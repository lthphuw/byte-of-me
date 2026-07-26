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
    <>
      {/* overflow-x-clip, not overflow-hidden: `hidden` makes this element the
          nearest scroll container for every `position: sticky` descendant, and
          because the page scrolls on <html> that container never scrolls — so
          sticky never engages anywhere on the public site. `clip` still stops
          wide children (code blocks, tables) from overflowing sideways without
          establishing a scroll container. */}
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <PublicSiteHeader />
        <div className="container grid min-w-0 flex-1 gap-12">
          {/* min-w-0: as a grid item, <main> must be allowed to shrink below its
              content's min-content, otherwise wide children (e.g. blog code
              blocks) force it past the viewport on mobile. */}
          <main className="flex w-full min-w-0 flex-1 flex-col">{children}</main>
        </div>
        <PublicSiteFooter />
      </div>
    </>
  );
}
