import React from 'react';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { AUTH_MESSAGE_NAMESPACES, pickMessages } from '@/shared/i18n/messages';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';
import { PublicSiteFooterSection } from '@/widgets/public/public-site-footer';

export const dynamic = 'force-dynamic';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getAuthenticatedAdmin();
  if (user) {
    redirect('/dashboard');
  }

  // min-h-screen, not h-screen + overflow-hidden: the latter clips the form
  // with no way to scroll to it on short viewports (landscape phones).
  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), AUTH_MESSAGE_NAMESPACES)}
    >
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <div className="container relative flex flex-1 flex-col">
          <main className="flex flex-1 flex-col">{children}</main>
        </div>

        <PublicSiteFooterSection />
      </div>
    </NextIntlClientProvider>
  );
}
