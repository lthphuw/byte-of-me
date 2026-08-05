'use client';

import { useState } from 'react';
import {
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@byte-of-me/ui';
import { LayoutDashboard, LogOut, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { useSpaceNavItems } from '@/widgets/dashboard/space-shell/model/use-space-nav-items';

/**
 * The mobile half of the space navigation: a hamburger that opens the same
 * destinations the rail shows, in a drawer.
 *
 * Rendered by the *page* inside its own header rather than by `SpaceShell`,
 * deliberately. A shell-owned top bar would stack on top of every page's own
 * header, and on a phone the notes editor cannot spare 48px twice — that
 * doubled chrome is a large part of why the writing area felt cramped. Pages
 * that have no header of their own can still mount this on its own row.
 */
export function SpaceNavTrigger({ className }: { className?: string }) {
  const t = useTranslations('dashboard.space');
  const items = useSpaceNavItems();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('openNav')}
          className={cn('shrink-0', className)}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
        <SheetTitle className="sr-only">{t('navAriaLabel')}</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex size-7 items-center justify-center rounded-md">
              <Icons.logo />
            </div>
            <span className="text-base font-bold tracking-tight">
              {t('title')}
            </span>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-1 border-t border-border/40 p-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutDashboard className="size-4" />
              <span>{t('actions.dashboard')}</span>
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
      </SheetContent>
    </Sheet>
  );
}
