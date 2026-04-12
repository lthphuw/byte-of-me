import { DashboardSidebar } from '@/widgets/dashboard-sidebar/ui/dashboard-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="bg-muted/40 flex flex-1 flex-col overflow-hidden">
        <main className="container relative py-6 lg:py-8">
          <div className="mx-auto w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
