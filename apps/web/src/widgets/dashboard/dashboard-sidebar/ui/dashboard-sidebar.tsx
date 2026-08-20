'use client';

import { DatabaseZap, ExternalLink, Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DashboardNavRail } from './dashboard-nav-rail';

import { logOutDashboard } from '@/features/auth/lib';
import { BrandMark } from '@/shared/ui/brand-mark';
import {
  NavDrawer,
  NavDrawerAction,
  NavDrawerLink,
} from '@/shared/ui/nav-drawer';
import { useClearCache } from '@/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache';
import { useDashboardNavGroups } from '@/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups';

/**
 * The dashboard's navigation, in its two shapes: a 56px icon rail from `lg`
 * up, and a hamburger opening a labelled drawer below it.
 *
 * The drawer itself is `NavDrawer`, shared with the notes workspace. This file
 * supplies only what is genuinely the dashboard's: its destinations, and the
 * three footer entries that exist nowhere else.
 *
 * Labelled in the drawer and icon-only on the rail, which is not an
 * inconsistency but the point of each. The rail is for a set you have
 * memorised and want out of the way; a drawer is opened deliberately, covers
 * the screen while it is open, and costs nothing to make legible.
 */
export function DashboardSidebar() {
  const t = useTranslations('dashboard.sidebar');
  const groups = useDashboardNavGroups();
  const { clearCache, isPending: cacheClearing } = useClearCache();

  return (
    <>
      <DashboardNavRail />

      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 bg-background/80 px-2 py-1.5 backdrop-blur lg:hidden">
        <NavDrawer
          triggerLabel={t('openNav')}
          title="Byte of Me"
          brand={<BrandMark layer="cms" />}
          groups={groups}
          footer={(close) => (
            <>
              {/* Disabled and spinning while the purge is in flight: without
                  it the tap has no visible effect and gets repeated into a
                  second full purge. */}
              <NavDrawerAction
                onClick={() => void clearCache()}
                disabled={cacheClearing}
                aria-busy={cacheClearing}
              >
                {cacheClearing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <DatabaseZap className="size-4" />
                )}
                <span>{t('actions.clearCache')}</span>
              </NavDrawerAction>

              <NavDrawerLink href="/" target="_blank" onClick={close}>
                <ExternalLink className="size-4" />
                <span>{t('actions.viewSite')}</span>
              </NavDrawerLink>

              <form action={logOutDashboard}>
                <NavDrawerAction type="submit">
                  <LogOut className="size-4" />
                  <span>{t('actions.signOut')}</span>
                </NavDrawerAction>
              </form>
            </>
          )}
        />

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
