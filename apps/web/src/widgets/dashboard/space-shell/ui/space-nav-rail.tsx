'use client';

import {
  Icons,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { useSpaceNavItems } from '@/widgets/dashboard/space-shell/model/use-space-nav-items';

/**
 * Desktop-only icon rail, 56px wide.
 *
 * Narrow rather than a labelled 260px sidebar like the dashboard's: the notes
 * workspace already owns a 256px tree to the right of this, and two full
 * sidebars side by side leave the editor barely half the window. Mobile gets
 * the same destinations through `SpaceNavTrigger`, which pages mount inside
 * their own header so a phone never stacks two bars.
 */
export function SpaceNavRail() {
  const t = useTranslations('dashboard.space');
  const items = useSpaceNavItems();
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label={t('navAriaLabel')}
        className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border/50 bg-card py-3 md:flex"
      >
        <Link
          href="/dashboard"
          aria-label={t('actions.dashboard')}
          className="mb-2 flex size-9 items-center justify-center rounded-md"
        >
          <Icons.logo />
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            // `startsWith`, not equality: an open note lives at
            // `/space/notes/<id>` and must keep its section lit.
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-md transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                aria-label={t('actions.dashboard')}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="size-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('actions.dashboard')}</TooltipContent>
          </Tooltip>

          <form action={logOutDashboard}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="submit"
                  aria-label={t('actions.signOut')}
                  className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
