import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/features/auth/lib/session';
import { SessionProvider } from 'next-auth/react';

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
