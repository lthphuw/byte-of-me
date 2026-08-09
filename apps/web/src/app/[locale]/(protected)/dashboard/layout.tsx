import type { Metadata } from 'next';

import { buildIconSet } from '@/shared/lib/metadata';
import { DashboardSidebar } from '@/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar';

/**
 * The CMS gets its own favicon so a dashboard tab is distinguishable from the
 * public site and from the vault at 16px. Only `icons` is set here; every other
 * metadata field still comes from the locale layout.
 */
export const metadata: Metadata = {
  icons: buildIconSet('cms'),
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content.
          overflow-x-clip, not overflow-hidden: `hidden` would make this the
          nearest scroll container for sticky descendants (the profile editor's
          save bar), and since the page scrolls on <html> that container never
          scrolls, so the bar would never stick. */}
      {/* min-w-0: as a flex item next to the sidebar this box must be allowed
          to shrink below its content's min-content, or wide children (editor
          toolbar, tables) push it — and the whole page — past the viewport. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-muted/40">
        <main className="container relative py-6 lg:py-8">
          <div className="mx-auto w-full min-w-0 p-4 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
