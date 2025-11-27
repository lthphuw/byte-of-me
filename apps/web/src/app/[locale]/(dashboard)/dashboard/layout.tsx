import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default async function DashboardLayout({
                                                children,
                                              }: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  console.log("DashboardLayout user:", user);

  if (!user) {
    redirect(authOptions?.pages?.signIn || '/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <DashboardSidebar user={user} />

        {/* Main content */}
        <div className="flex-1 overflow-hidden bg-muted/40">
          <main className="container relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr]">
            <div className="mx-auto w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
