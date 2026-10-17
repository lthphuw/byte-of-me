import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { BootSplashOverlay } from './_boot-splash/boot-splash-overlay';
import { BootSplashReady } from './_boot-splash/boot-splash-ready';
import { BootSplashScript } from './_boot-splash/boot-splash-script';

import { redirect } from '@/shared/i18n/navigation';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';
import { PATHNAME_HEADER } from '@/shared/lib/constants';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedAdmin();

  if (!user) {
    // `from` lets sign-in return the visitor to their page, not the dashboard. The pathname comes from
    // the proxy because a layout is never handed the URL (see `PATHNAME_HEADER`).
    const from = (await headers()).get(PATHNAME_HEADER);

    redirect({
      href: {
        pathname: '/auth/login',
        query: from ? { from } : undefined,
      },
      locale: await getLocale(),
    });
  }

  // No `NextIntlClientProvider`: `dashboard/` mounts its own (see shared/i18n/messages.ts). The splash
  // sits outside the redirect logic; its server pieces stream with this HTML so the inline script runs
  // before first paint. `BootSplashReady` is the only client piece and owns only dismissal timing.
  return (
    <>
      <BootSplashScript />
      <BootSplashOverlay />
      <BootSplashReady />
      {children}
    </>
  );
}
