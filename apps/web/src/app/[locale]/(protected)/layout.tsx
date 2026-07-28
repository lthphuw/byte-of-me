import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickMessages,
  PROTECTED_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';
import { getAuthenticatedAdmin } from '@/shared/lib/auth';





export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedAdmin();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <NextIntlClientProvider
      messages={pickMessages(await getMessages(), PROTECTED_MESSAGE_NAMESPACES)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
