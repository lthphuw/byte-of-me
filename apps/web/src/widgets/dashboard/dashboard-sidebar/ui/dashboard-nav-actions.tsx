'use client';

import { DatabaseZap, ExternalLink, Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NavDrawerAction, NavDrawerLink } from '@/shared/ui/nav-drawer';
import { useClearCache } from '@/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache';
import { useLogOutDashboard } from '@/widgets/dashboard/dashboard-sidebar/lib/use-log-out-dashboard';

/**
 * The three footer entries that exist only in the dashboard, shared by the
 * mobile drawer and the expanded desktop column.
 */
export function DashboardNavActions({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const t = useTranslations('dashboard.sidebar');
  const { clearCache, isPending: cacheClearing } = useClearCache();
  const { signOut } = useLogOutDashboard();

  return (
    <>
      {/* Disabled and spinning while the purge is in flight: without it the tap
          has no visible effect and gets repeated into a second full purge. */}
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

      <NavDrawerLink href="/" target="_blank" onClick={onNavigate}>
        <ExternalLink className="size-4" />
        <span>{t('actions.viewSite')}</span>
      </NavDrawerLink>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          signOut();
        }}
      >
        <NavDrawerAction type="submit">
          <LogOut className="size-4" />
          <span>{t('actions.signOut')}</span>
        </NavDrawerAction>
      </form>
    </>
  );
}
