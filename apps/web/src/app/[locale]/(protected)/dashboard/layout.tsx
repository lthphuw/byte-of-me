import { getQueryClient } from '@byte-of-me/query';
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
        {/* Inline `paddingLeft`/`paddingRight`, not a Tailwind class: the landscape safe area
            (`viewportFit: 'cover'`), applied once so whichever child is flush with the device
            edge inherits it. */}
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

          {/* Main content. overflow-x-clip, not overflow-hidden: `hidden` makes this the scroll
              container for sticky descendants (profile save bar), and the page scrolls on <html>, so
              they would never stick. */}
          {/* min-w-0: as a flex item next to the sidebar this box must be allowed
              to shrink below its content's min-content, or wide children (editor
              toolbar, tables) push it — and the whole page — past the viewport. */}
          {/* pb-safe on this wrapper, not `<main>`, so it stacks with main's `py-6 lg:py-8` instead of
              fighting for the same property (else the last row sat under the iOS home indicator). */}
          <div className="pb-safe flex min-w-0 flex-1 flex-col overflow-x-clip bg-muted/40">
            {/* One padding layer: `container` is already `padding: 2rem` at every breakpoint
                (tailwind.config.ts); an inner `p-4 lg:p-10` stacked to 48px per side on a 375px
                phone and 72px at `lg`. */}
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
