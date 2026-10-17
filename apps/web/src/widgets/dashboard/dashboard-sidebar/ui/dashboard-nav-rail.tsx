'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import {
  DatabaseZap,
  ExternalLink,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DashboardNavActions } from './dashboard-nav-actions';

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';
import { isNavItemActive, NavDrawerGroups } from '@/shared/ui/nav-drawer';
import { useClearCache } from '@/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache';
import { useLogOutDashboard } from '@/widgets/dashboard/dashboard-sidebar/lib/use-log-out-dashboard';
import { useDashboardNavGroups } from '@/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups';

/**
 * The one place a rail button's size, radius and colours are decided.
 * 44px on touch, 36px only under `can-hover:` (AGENTS §14).
 */
const RAIL_BUTTON =
  'flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors can-hover:min-h-9 can-hover:min-w-9 hover:bg-muted hover:text-foreground';

/**
 * Desktop sidebar from `lg`: a labelled column, or a 56px icon rail.
 * Each control has an `aria-label`, because a tooltip is hover-only.
 */
export function DashboardNavRail({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('dashboard.sidebar');
  const groups = useDashboardNavGroups();
  const pathname = usePathname();
  const { clearCache, isPending: cacheClearing } = useClearCache();
  const { signOut } = useLogOutDashboard();

  const toggleLabel = expanded
    ? t('actions.collapseNav')
    : t('actions.expandNav');
  // One element for both branches: the header when expanded, under the mark when not.
  const toggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          className={RAIL_BUTTON}
        >
          {expanded ? (
            <PanelLeftClose className="size-[18px]" />
          ) : (
            <PanelLeftOpen className="size-[18px]" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{toggleLabel}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {/* `pt-3 pb-[max(...)]`, not `py-3`: the layout's outer row handles the left inset, but the
          BOTTOM edge is this sibling's own (same floor as `nav-drawer.tsx`'s bottom group). */}
      <aside
        aria-label={t('navAriaLabel')}
        className={cn(
          'sticky top-0 z-40 hidden h-dvh shrink-0 flex-col overflow-x-clip border-r border-border/50 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:flex',
          // No width animation: .claude/rules/motion.md rules out animating width.
          expanded ? 'w-60' : 'w-14 items-center gap-1'
        )}
      >
        {expanded ? (
          <>
            <div className="flex items-center gap-2 px-3 pb-3">
              <div
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-md"
              >
                <BrandMark layer="cms" />
              </div>
              <span className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
                Byte of Me
              </span>
              {toggle}
            </div>

            <NavDrawerGroups
              groups={groups}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2"
            />

            <div className="mt-auto space-y-1 border-t border-border/40 px-3 pt-2">
              <div className="flex items-center gap-1 pb-1">
                <ColorSchemeModeToggle side="top" align="start" />
                <I18nToggle side="top" align="start" />
              </div>
              <DashboardNavActions />
            </div>
          </>
        ) : (
          <>
            {/* A mark, not a link: /dashboard is the first button below; two links with the same
                name and destination a row apart are noise to anyone tabbing or listening. */}
            <div
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-md"
            >
              <BrandMark layer="cms" />
            </div>
            <div className="mb-2">{toggle}</div>

            {/* `overflow-y-auto` on the destinations only. Ten buttons fit on any
                laptop, but the utility group below must stay pinned to the foot
                rather than being pushed off a short window with them. */}
            <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
              {groups.map((group, index) => (
                <div
                  key={group.label}
                  // A named group, announced and drawn as a rule: the rail has no room for four
                  // captions, but the clustering is the point.
                  role="group"
                  aria-label={group.label}
                  className={cn(
                    'flex flex-col items-center gap-1',
                    index > 0 && 'mt-2 border-t border-border/40 pt-2'
                  )}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    // Same active rule as the drawer.
                    const isActive = isNavItemActive(item, pathname);

                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              RAIL_BUTTON,
                              isActive && 'bg-muted text-foreground'
                            )}
                          >
                            <Icon className="size-[18px]" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="mt-auto flex flex-col items-center gap-1 border-t border-border/40 pt-2">
              <ColorSchemeModeToggle side="right" align="center" />
              <I18nToggle side="right" align="center" />

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* `disabled` plus a spinner: a full revalidate is slow, and an unchanged
                      icon reads as a missed click that invites a second purge. `aria-busy`
                      says to a reader what the spin says to an eye. */}
                  <button
                    type="button"
                    onClick={() => void clearCache()}
                    disabled={cacheClearing}
                    aria-busy={cacheClearing}
                    aria-label={t('actions.clearCache')}
                    className={cn(RAIL_BUTTON, 'disabled:opacity-60')}
                  >
                    {cacheClearing ? (
                      <Loader2 className="size-[18px] animate-spin" />
                    ) : (
                      <DatabaseZap className="size-[18px]" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('actions.clearCache')}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/"
                    target="_blank"
                    aria-label={t('actions.viewSite')}
                    className={RAIL_BUTTON}
                  >
                    <ExternalLink className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('actions.viewSite')}
                </TooltipContent>
              </Tooltip>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  signOut();
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      aria-label={t('actions.signOut')}
                      className={RAIL_BUTTON}
                    >
                      <LogOut className="size-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t('actions.signOut')}
                  </TooltipContent>
                </Tooltip>
              </form>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
