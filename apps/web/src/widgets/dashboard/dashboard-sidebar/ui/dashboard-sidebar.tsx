'use client';

import { useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@byte-of-me/ui';
import { DatabaseZap, ExternalLink, Loader2, LogOut, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DashboardNavItems } from './dashboard-nav-items';
import { DashboardNavRail } from './dashboard-nav-rail';

import { logOutDashboard } from '@/features/auth/lib';
import { Link } from '@/shared/i18n/navigation';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';
import { useClearCache } from '@/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache';
import { useDashboardNavGroups } from '@/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups';

/**
 * The phone's copy of the navigation: the same destinations the rail shows,
 * with their names.
 *
 * Labelled here and icon-only on the desktop rail, which is not an
 * inconsistency but the point of each. The rail is for a set you have
 * memorised and want out of the way; a drawer is opened deliberately, covers
 * the screen while it is open, and costs nothing to make legible. The notes
 * workspace splits the same way, and this is where the icons' names live for
 * anyone who has not learned them yet.
 */
function DashboardDrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations('dashboard.sidebar');
  const groups = useDashboardNavGroups();
  const { clearCache, isPending: cacheClearing } = useClearCache();

  return (
    <div className="flex h-full flex-col">
      {/* `span`, not the `h1` this used to be. Every dashboard page has its own
          `h1` — "Welcome back, …" on the landing one — so the sidebar's was a
          second top-level heading on every screen, and a reader jumping by
          headings landed on the product name before the page. */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex size-7 items-center justify-center rounded-md">
          <BrandMark layer="cms" />
        </div>
        <span className="text-base font-bold tracking-tight">Byte of Me</span>
      </div>

      {/* The four group names are still here, still read out, and no longer
          drawn: a hairline says "these belong together" as well as a caption
          does. Deleting the headings outright would have been the easy version
          and the wrong one — it would flatten ten destinations into one
          undifferentiated list for anyone navigating by heading. */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div
            key={group.label}
            className="space-y-1 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
          >
            <h2 className="sr-only">{group.label}</h2>
            <DashboardNavItems items={group.items} onItemClick={onNavigate} />
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/40 p-3">
        {/* A row of icons rather than two more labelled lines: these are the
            only controls here that show their current value in the trigger
            itself — a flag and a sun or a moon — so a text label beside them
            would repeat what the icon already says.

            `side="top"`: a menu opening to the right of a 256px drawer has
            barely a sliver of screen to land in. Upwards it stays inside the
            drawer it belongs to. */}
        <div className="flex items-center gap-1 pb-1">
          <ColorSchemeModeToggle side="top" align="start" />
          <I18nToggle side="top" align="start" />
        </div>

        {/* Disabled and spinning while the purge is in flight, for the reason
            the rail's copy of this button records: without it the click has no
            visible effect and gets repeated into a second full purge. */}
        <button
          type="button"
          onClick={() => void clearCache()}
          disabled={cacheClearing}
          aria-busy={cacheClearing}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          {cacheClearing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DatabaseZap className="size-4" />
          )}
          <span>{t('actions.clearCache')}</span>
        </button>

        <Link
          target="_blank"
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          <span>{t('actions.viewSite')}</span>
        </Link>

        <form action={logOutDashboard}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span>{t('actions.signOut')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * The dashboard's navigation, in its two shapes: a 56px icon rail from `lg`
 * up, and a hamburger opening a labelled drawer below it.
 */
export function DashboardSidebar() {
  const t = useTranslations('dashboard.sidebar');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <DashboardNavRail />

      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 bg-background/80 px-2 py-2 backdrop-blur lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('openNav')}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          {/* `w-64`, the width the space drawer already uses — the two are the
              same drawer on the same phone and had no reason to differ. */}
          <SheetContent
            side="left"
            className="w-64 p-0"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">{t('navAriaLabel')}</SheetTitle>
            <DashboardDrawerContent
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md">
            <BrandMark layer="cms" />
          </div>
          <span className="text-base font-bold tracking-tight">Byte of Me</span>
        </div>
      </div>
    </>
  );
}
