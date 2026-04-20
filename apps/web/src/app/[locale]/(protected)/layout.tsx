import { redirect } from 'next/navigation';

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

  return children;
}
