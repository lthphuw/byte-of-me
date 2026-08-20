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

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';

export interface NavDrawerItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Light this entry only on an exact pathname match. The default is a prefix
   * match, which is what keeps `/space/notes` lit while a note is open at
   * `/space/notes/<id>` — and exactly what a section root like `/space` or
   * `/dashboard` must opt out of, being a prefix of every route beneath it.
   */
  exact?: boolean;
  /** Rendered at the end of the row; the "soon" badge is the only user. */
  badge?: ReactNode;
}

export interface NavDrawerGroup {
  /**
   * Announced, not drawn. A hairline says "these belong together" as well as
   * a caption does, but deleting the name outright would flatten ten
   * destinations into one undifferentiated list for anyone navigating by
   * heading.
   */
  label: string;
  items: NavDrawerItem[];
}

/**
 * One row of the drawer, at the one height every row here uses.
 *
 * Exported because the footer entries are not links to sections — signing out
 * is a form submit, opening settings is a dialog — and they must not be a
 * second, slightly different row. `min-h-11` is 44px: measured before this
 * existed, every row in both drawers was 36px.
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

/**
 * The navigation drawer both signed-in surfaces open below `lg`.
 *
 * There used to be two of these — `dashboard-sidebar.tsx` and
 * `space-nav-trigger.tsx` — around 150 lines each, describing the same drawer
 * in different words. They had already drifted: one grouped its destinations
 * behind hairlines and the other was a flat list, and the footers had
 * diverged in both contents and order. Nothing held them together, so they
 * came apart. Here the shape is one thing and each surface supplies only what
 * genuinely differs: its brand, its destinations, and its own footer entries.
 *
 * The trigger lives here too, so the hamburger cannot end up a different size
 * or a different distance from the corner on one surface than the other.
 *
 * Below `lg` on BOTH surfaces, deliberately. The desktop alternative is a
 * 56px icon rail with no labels, which depends on hover tooltips to say what
 * anything is — and a tablet, the width band this decides, is a touch device
 * with no hover at all. The rail is for a pointer; this is for a finger.
 */
export function NavDrawer({
  triggerLabel,
  title,
  brand,
  groups,
  footer,
  className,
}: {
  /** Accessible name of the hamburger. */
  triggerLabel: string;
  /** Accessible name of the drawer itself, and the visible wordmark. */
  title: string;
  brand: ReactNode;
  groups: NavDrawerGroup[];
  /**
   * Surface-specific entries, built from `NavDrawerAction`/`NavDrawerLink`.
   *
   * A function rather than a node so the footer can close the drawer: opening
   * the settings dialog or following the link to the other surface has to
   * dismiss this first, and only the drawer knows how.
   */
  footer?: (close: () => void) => ReactNode;
  /** Applied to the trigger, for the `lg:hidden` each caller passes. */
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={triggerLabel}
          // `size-11` overrides the variant's own `h-9 w-9`: this is the one
          // control that opens navigation on a phone, and it measured 36px.
          className={cn('size-11 shrink-0', className)}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      {/* Capped at 85vw rather than a flat 18rem: 288px of a 320px phone
          leaves 32px of page behind the drawer, which reads as a full-screen
          takeover with no way back except the X. */}
      <SheetContent
        side="left"
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

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
            {groups.map((group) => (
              <div
                key={group.label}
                className="space-y-1 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
              >
                <h2 className="sr-only">{group.label}</h2>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <NavDrawerLink
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            isActive &&
                              'bg-muted font-medium text-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.badge}
                        </NavDrawerLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* `env(safe-area-inset-bottom)`: on a phone with a gesture bar the
              last entry sat underneath it — "Sign out" was clipped by the
              home indicator on both surfaces. `max()` keeps the ordinary
              padding on everything else. */}
          <div className="mt-auto space-y-1 border-t border-border/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Icons rather than two more labelled rows: these are the only
                controls here that show their current value in the trigger
                itself — a flag, and a sun or a moon — so a label beside them
                would repeat what the icon already says.

                `side="top"`: a menu opening to the right of a 288px drawer
                has barely a sliver of screen to land in. Upwards it stays
                inside the drawer it belongs to. */}
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
