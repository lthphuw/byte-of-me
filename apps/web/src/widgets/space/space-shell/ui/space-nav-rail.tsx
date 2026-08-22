'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';
import { useSpaceNavItems } from '@/widgets/space/space-shell/model/use-space-nav-items';
import { useSettingsDialog } from '@/widgets/space/space-shell/ui/space-settings-provider';

/**
 * Desktop-only icon rail, 56px wide.
 *
 * Narrow rather than a labelled 260px sidebar like the dashboard's: the notes
 * workspace already owns a 256px tree to the right of this, and two full
 * sidebars side by side leave the editor barely half the window. Below `lg`
 * the same destinations arrive through `SpaceNavTrigger`, which pages mount
 * inside their own header so a phone never stacks two bars.
 *
 * `lg`, not the `md` this used to be — the dashboard's rail has always
 * appeared at `lg`, so between 768px and 1023px the two surfaces navigated
 * differently on the same device: a rail here, a hamburger there. `lg` is the
 * value both now use, and it is the right one of the two: a rail is icons
 * with no labels, leaning entirely on hover tooltips to say what they are,
 * and every device in that band is a touch device with no hover at all.
 */
export function SpaceNavRail() {
  const t = useTranslations('dashboard.space');
  const items = useSpaceNavItems();
  const pathname = usePathname();
  const { open: openSettings } = useSettingsDialog();

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label={t('navAriaLabel')}
        className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border/50 bg-card py-3 lg:flex"
      >
        <Link
          href="/dashboard"
          aria-label={t('actions.dashboard')}
          className="mb-2 flex size-9 items-center justify-center rounded-md"
        >
          <BrandMark layer="space" />
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
          {/* Theme and language, the same two controls the public header
              carries — until they moved into `shared/ui` they existed only out
              there, so the only way to leave dark mode while writing was to go
              back to the marketing site. Both are icon buttons with their own
              dropdowns, which is exactly the shape this rail is made of.

              Above the divider-less group below rather than among the
              destinations above: neither is a place you can navigate to, and
              the rail lights the current one.

              `side="right"` because everything in a 56px rail has to open
              sideways — the default drop-downwards belongs to a header with a
              page under it. Here it would open into the bottom edge of the
              window and be rescued by collision detection, which lands the
              menu somewhere nobody chose. Right, centred, is also exactly
              where this rail's own tooltips appear. */}
          <ColorSchemeModeToggle side="right" align="center" />
          <I18nToggle side="right" align="center" />

          {/* Not in `useSpaceNavItems` with the others: every entry in that
              list is a route the rail can light up as current, and this one
              opens a dialog over whatever page you are on. Putting it in the
              bottom group alongside Dashboard and Sign out also matches where
              a settings control is looked for. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openSettings}
                aria-label={t('settings.open')}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t('settings.openWithShortcut')}
            </TooltipContent>
          </Tooltip>

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
            <TooltipContent side="right">
              {t('actions.dashboard')}
            </TooltipContent>
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
