import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/session';
import { DashboardSidebar } from '@/components/dashboard-sidebar';





export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <DashboardSidebar user={user} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/40">
        <main className="container relative py-6 lg:py-8">
          <div className="mx-auto w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
