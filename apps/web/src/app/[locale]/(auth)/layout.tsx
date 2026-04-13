import React from 'react';
import { getAuthenticatedUser } from '@/features/auth/lib/session';
import { PublicSiteFooter } from '@/widgets/public/public-site-footer/ui';

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="container relative flex flex-1 flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>

      <PublicSiteFooter />
    </div>
  );
}
