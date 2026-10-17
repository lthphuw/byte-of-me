'use client';

import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@byte-of-me/ui';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';

interface NavDrawerItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Match the pathname exactly. The default prefix match keeps `/dashboard/blogs` lit on
   * a post; a section root like `/dashboard` must opt out, being a prefix of every route.
   */
  exact?: boolean;
}

export interface NavDrawerGroup {
  /**
   * Announced (`sr-only` h2), not drawn: deleting it would flatten the destinations into
   * one list for anyone navigating by heading.
   */
  label: string;
  items: NavDrawerItem[];
}

/**
 * The one drawer row, `min-h-11` = 44px (rows measured 36px). `NavDrawerAction` and
 * `NavDrawerLink` are exported so sign-out and settings share it, not a lookalike.
 */
const ROW_CLASS =
  'flex w-full min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors';

export function NavDrawerAction({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        ROW_CLASS,
        'text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function NavDrawerLink({
  href,
  className,
  children,
  onClick,
  target,
  'aria-current': ariaCurrent,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  target?: string;
  'aria-current'?: 'page';
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={target}
      aria-current={ariaCurrent}
      className={cn(
        ROW_CLASS,
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}

/** The one active rule: `exact` entries match the pathname, the rest match a prefix. */
export function isNavItemActive(
  item: NavDrawerItem,
  pathname: string
): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/**
 * Hairline-separated destinations, shared by the drawer and the desktop sidebar.
 * Each group is announced as an `h2`, and the active entry gets `aria-current`.
 */
export function NavDrawerGroups({
  groups,
  onNavigate,
  className,
}: {
  groups: NavDrawerGroup[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {groups.map((group) => (
        <div
          key={group.label}
          className="space-y-1 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
        >
          <h2 className="sr-only">{group.label}</h2>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item, pathname);

              return (
                <li key={item.href}>
                  <NavDrawerLink
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      isActive &&
                        'bg-muted font-medium text-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavDrawerLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * The drawer both signed-in surfaces open below `lg`, trigger included so the hamburger
 * cannot differ per surface. Below `lg`: a labelled column at tablet width takes a third
 * of the screen, and the collapsed rail needs hover tooltips touch lacks.
 */
export function NavDrawer({
  triggerLabel,
  title,
  brand,
  groups,
  footer,
}: {
  /** Accessible name of the hamburger. */
  triggerLabel: string;
  /** Accessible name of the drawer itself, and the visible wordmark. */
  title: string;
  brand: ReactNode;
  groups: NavDrawerGroup[];
  /**
   * Surface-specific entries from `NavDrawerAction`/`NavDrawerLink`. A function so the
   * footer can close the drawer first (settings dialog, link to the other surface).
   */
  footer?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tDialog = useTranslations('components.dialog');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={triggerLabel}
          // `min-h-*`, not `size-11`: tailwind-merge@1.14 has no rule for `size-*`,
          // so it cannot cancel the variant's `h-9 w-9`, which wins by source order.
          className="min-h-11 min-w-11 shrink-0"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      {/* Capped at 85vw rather than a flat 18rem: 288px of a 320px phone
          leaves 32px of page behind the drawer, which reads as a full-screen
          takeover with no way back except the X. */}
      <SheetContent
        side="left"
        closeLabel={tDialog('close')}
        className="w-[min(18rem,85vw)] p-0"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <div className="flex h-full flex-col">
          {/* `span`, not an `h1`. Every page under here has its own `h1`, so a
              heading in the drawer would be a second top-level one on every
              screen — and a reader jumping by headings would land on the
              product name before the page. */}
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex size-7 items-center justify-center rounded-md">
              {brand}
            </div>
            <span className="text-base font-bold tracking-tight">{title}</span>
          </div>

          <NavDrawerGroups
            groups={groups}
            onNavigate={() => setOpen(false)}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-2"
          />

          {/* `env(safe-area-inset-bottom)`: on a phone with a gesture bar the
              last entry sat underneath it — "Sign out" was clipped by the
              home indicator on both surfaces. `max()` keeps the ordinary
              padding on everything else. */}
          <div className="mt-auto space-y-1 border-t border-border/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* `side="top"`: a menu opening right of the 288px drawer has no room to land. */}
            <div className="flex items-center gap-1 pb-1">
              <ColorSchemeModeToggle side="top" align="start" />
              <I18nToggle side="top" align="start" />
            </div>

            {footer?.(() => setOpen(false))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
