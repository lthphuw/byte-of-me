import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { workspaceSettingsQueries } from '@/entities/workspace-settings/query/workspace-settings-queries';
import {
  DASHBOARD_MESSAGE_NAMESPACES,
  pickMessages,
} from '@/shared/i18n/messages';
import { buildIconSet } from '@/shared/lib/metadata';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import { SkipToContentLink } from '@/shared/ui/skip-to-content-link';
import {
  isSidebarExpanded,
  SIDEBAR_COOKIE,
} from '@/widgets/dashboard/dashboard-sidebar/lib/sidebar-state';
import { DashboardSidebar } from '@/widgets/dashboard/dashboard-sidebar/ui/dashboard-sidebar';

/**
 * The CMS gets its own favicon so a dashboard tab is distinguishable from the
 * public site at 16px. Only `icons` is set here; every other
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
  // The CMS's own message catalogue. Mounted here rather than on
  // `(protected)/layout.tsx` so each protected surface ships only the copy it reads.
  const messages = pickMessages(
    await getMessages(),
    DASHBOARD_MESSAGE_NAMESPACES
  );

  // The owner's settings, prefetched and hydrated, so the first client render
  // already holds them: `useWorkspaceSettings()` reads this query, and every
  // form under the dashboard gets the real `imageCompression` config.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(workspaceSettingsQueries.current());

  // Read on the server, so the first HTML already has the saved state and nothing flashes.
  const cookieStore = await cookies();
  const sidebarExpanded = isSidebarExpanded(
    cookieStore.get(SIDEBAR_COOKIE)?.value
  );

  return (
    <NextIntlClientProvider messages={messages}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* `paddingLeft`/`paddingRight`, not a Tailwind class: this is the
            landscape left/right safe area (see `[locale]/layout.tsx`'s
            `viewportFit: 'cover'`), applied once here so whichever child is
            flush with the device edge — the rail at `lg`, the mobile topbar
            below it — inherits it for free instead of each padding its own
            edge. */}
        <div
          className="flex min-h-screen flex-col lg:flex-row"
          style={{
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          {/* WCAG 2.4.1. The sidebar below is fifteen controls, re-tabbed on every
              single navigation without this. */}
          <SkipToContentLink targetId="main-content" />

          {/* Sidebar */}
          <DashboardSidebar initialExpanded={sidebarExpanded} />

          {/* Main content.
              overflow-x-clip, not overflow-hidden: `hidden` would make this the
              nearest scroll container for sticky descendants (the profile editor's
              save bar), and since the page scrolls on <html> that container never
              scrolls, so the bar would never stick. */}
          {/* min-w-0: as a flex item next to the sidebar this box must be allowed
              to shrink below its content's min-content, or wide children (editor
              toolbar, tables) push it — and the whole page — past the viewport. */}
          {/* pb-safe: a bare bottom inset on this wrapper, not on `<main>`
              itself, so it stacks with `main`'s own `py-6 lg:py-8` instead of
              fighting it for the same property. Without it the last row of a
              scrolled-to-the-bottom dashboard page sat flush under the iOS
              home indicator. */}
          <div className="pb-safe flex min-w-0 flex-1 flex-col overflow-x-clip bg-muted/40">
            {/* One padding layer, not two. `container` is `padding: 2rem` at every
                breakpoint (tailwind.config.ts), and the inner `p-4 lg:p-10` used to
                stack on top of it: 48px of horizontal padding per side on a 375px
                phone, 72px at `lg`, before any page drew anything. The gutter stays; the
                second helping is gone. */}
            <main
              id="main-content"
              tabIndex={-1}
              className="container relative py-6 lg:py-8"
            >
              <div className="mx-auto w-full min-w-0">{children}</div>
            </main>
          </div>
        </div>
      </HydrationBoundary>
    </NextIntlClientProvider>
  );
}
