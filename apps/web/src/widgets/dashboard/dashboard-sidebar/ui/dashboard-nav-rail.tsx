'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import { DatabaseZap, ExternalLink, Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';
import { useClearCache } from '@/widgets/dashboard/dashboard-sidebar/lib/use-clear-cache';
import { useDashboardNavGroups } from '@/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups';

/** The one place a rail button's size, radius and colours are decided. */
const RAIL_BUTTON =
  'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

/**
 * Desktop-only icon rail, 56px wide — the same rail the notes workspace uses,
 * for the same reason: the destinations are a fixed, small, memorised set, and
 * a labelled column spends 200px of every screen restating them.
 *
 * The trade this makes is real and worth naming: ten icons carry less meaning
 * than ten words, and Companies / Education / Tech Stacks are neighbours in
 * both position and idea. Three things carry the weight the labels used to.
 * Every button has a tooltip with its name. The four groups are still groups,
 * separated by a hairline, so the icons sit in remembered clusters of 2-4-3-1
 * rather than one run of ten. And the phone keeps the labelled drawer, so the
 * names are never more than one narrow window away.
 *
 * `aria-label` on every control, not a tooltip alone: a tooltip is a hover
 * affordance and reaches neither a screen reader reliably nor a keyboard at
 * all. §14 of the guide, and the same pattern `SpaceNavRail` follows.
 */
export function DashboardNavRail() {
  const t = useTranslations('dashboard.sidebar');
  const groups = useDashboardNavGroups();
  const pathname = usePathname();
  const { clearCache, isPending: cacheClearing } = useClearCache();

  return (
    <TooltipProvider delayDuration={200}>
      {/* `pt-3 pb-[max(...)]`, not `py-3`: the left inset is handled once, on
          the dashboard layout's outer row, since this rail and the content
          column share that edge — but the BOTTOM edge is this element's own,
          a flex sibling that layout never pads on its behalf. The floor
          matches `nav-drawer.tsx`'s own bottom group for the same reason. */}
      <aside
        aria-label={t('navAriaLabel')}
        className="sticky top-0 z-40 hidden h-dvh w-14 shrink-0 flex-col items-center gap-1 border-r border-border/50 bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:flex"
      >
        {/* A mark, not a link — unlike the space rail's, whose logo is the way
            back OUT to the dashboard. Here /dashboard is the first button
            below, so making this a link too would put two links with the same
            name and the same destination one row apart, which is noise to
            anyone tabbing or listening rather than looking. */}
        <div
          aria-hidden="true"
          className="mb-2 flex size-9 items-center justify-center rounded-md"
        >
          <BrandMark layer="cms" />
        </div>

        {/* `overflow-y-auto` on the destinations only. Ten buttons fit on any
            laptop, but the utility group below must stay pinned to the foot
            rather than being pushed off a short window with them. */}
        <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {groups.map((group, index) => (
            <div
              key={group.label}
              // A real group with a real name, announced, and drawn as a rule.
              // The rail has no room for four captions and no need for them:
              // the clustering is the whole point, and a reader who wants the
              // names still gets them.
              role="group"
              aria-label={group.label}
              className={cn(
                'flex flex-col items-center gap-1',
                index > 0 && 'mt-2 border-t border-border/40 pt-2'
              )}
            >
              {group.items.map((item) => {
                const Icon = item.icon;
                // Equality, not `startsWith`: `/dashboard` is a prefix of
                // every other route here, so prefix matching would light the
                // first button up permanently.
                const isActive = pathname === item.href;

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
                    <TooltipContent side="right">{item.label}</TooltipContent>
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
              {/* `disabled` plus a spinner, because a full-layout revalidate
                  takes long enough that an unchanged icon reads as a click
                  that did not register — and the response to that is a second
                  click and a second purge. `aria-busy` says the same thing to
                  a reader that the spin says to an eye. */}
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

          <form action={logOutDashboard}>
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
      </aside>
    </TooltipProvider>
  );
}
