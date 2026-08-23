import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { WorkspaceSettingsProvider } from '@/entities/workspace-settings';
import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import {
  DASHBOARD_MESSAGE_NAMESPACES,
  pickMessages,
} from '@/shared/i18n/messages';
import { buildIconSet } from '@/shared/lib/metadata';
import { SkipToContentLink } from '@/shared/ui/skip-to-content-link';
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
  // The CMS's own message catalogue. Mounted here rather than on
  // `(protected)/layout.tsx` so the vault's `dashboard.note` / `dashboard.space`
  // copy — half the namespace — stays off this surface's RSC payload.
  const messages = pickMessages(
    await getMessages(),
    DASHBOARD_MESSAGE_NAMESPACES
  );

  // Read on the server and seeded into the provider so every form under the
  // dashboard — blog, project, education, profile — shares the owner's real
  // `imageCompression` config through `ImageUpload`'s context fallback,
  // instead of each one silently defaulting to `IMAGE_COMPRESSION_DEFAULTS`.
  // Only `MediaManager`'s own compression popover writes through this
  // provider's `update`; every other consumer here only ever reads it.
  //
  // Imported by its own path rather than through `@/entities/workspace-settings`
  // because it is a plain server module that value-imports prisma; the barrel is
  // client-reachable. Its own `api/index.ts` says the same thing at more length.
  const settings = await getWorkspaceSettings();

  return (
    <NextIntlClientProvider messages={messages}>
      <WorkspaceSettingsProvider initial={settings}>
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
            {/* One padding layer, not two. `container` is `padding: 2rem` at every
                breakpoint (tailwind.config.ts), and the inner `p-4 lg:p-10` used to
                stack on top of it: 48px of horizontal padding per side on a 375px
                phone, 72px at `lg`, before any page drew anything. `space-shell.tsx`
                names this exact stack as why `/space` abandoned the pattern. The
                gutter stays; the second helping is gone. */}
            <main
              id="main-content"
              tabIndex={-1}
              className="container relative py-6 lg:py-8"
            >
              <div className="mx-auto w-full min-w-0">{children}</div>
            </main>
          </div>
        </div>
      </WorkspaceSettingsProvider>
    </NextIntlClientProvider>
  );
}
