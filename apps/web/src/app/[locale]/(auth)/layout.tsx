import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { AUTH_MESSAGE_NAMESPACES, pickMessages } from '@/shared/i18n/messages';
import { redirect } from '@/shared/i18n/navigation';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';
import { PublicSiteFooterSection } from '@/widgets/public/public-site-footer';

export const dynamic = 'force-dynamic';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getAuthenticatedAdmin();
  if (user) {
    redirect({ href: '/dashboard', locale: await getLocale() });
  }

  // min-h-screen, not h-screen + overflow-hidden: the latter clips the form
  // with no way to scroll to it on short viewports (landscape phones).
  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), AUTH_MESSAGE_NAMESPACES)}
    >
      {/* px-safe pb-safe: `viewport-fit=cover` extends this page into the
          landscape sensor-housing edge and under the home indicator — this
          layout has no fixed header of its own to absorb the top inset, but
          nothing here reaches the top edge either, so only left/right/bottom
          are needed. */}
      <div className="px-safe pb-safe flex min-h-screen flex-col overflow-x-clip">
        <div className="container relative flex flex-1 flex-col">
          <main className="flex flex-1 flex-col">{children}</main>
        </div>

        <PublicSiteFooterSection />
      </div>
    </NextIntlClientProvider>
  );
}
