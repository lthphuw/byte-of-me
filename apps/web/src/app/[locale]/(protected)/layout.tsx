import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
