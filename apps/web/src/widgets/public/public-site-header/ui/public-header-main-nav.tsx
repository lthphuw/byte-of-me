'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import { PublicHeaderLogo } from '@/widgets/public/public-site-header/ui/public-header-logo';
import { PublicHeaderMobileNav } from '@/widgets/public/public-site-header/ui/public-header-mobile-nav';

interface MainNavProps {
  items: MainNavItem[];
  children?: React.ReactNode;
  minimized?: boolean;
}

export const PublicHeaderMainNav = React.forwardRef<
  HTMLDivElement,
  MainNavProps
>(({ items, children, minimized = false }, ref) => {
  const locale = useLocale();
  const t = useTranslations('global.header.nav');
  const segment = useSelectedLayoutSegment();

  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const navItems = items.filter((it) => !it.onlyMobile);

  return (
    <div ref={ref} className="flex items-center gap-6 md:gap-10">
      <Link
        href={Routes.Homepage}
        locale={locale}
        className="hidden items-center md:flex"
      >
        <PublicHeaderLogo minimized={minimized} />
      </Link>

      {navItems.length > 0 && (
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              locale={locale}
            >
              <Button
                variant="ghost"
                className={cn(
                  'text-md font-medium',
                  item.href.startsWith(`/${segment}`)
                    ? 'text-foreground font-semibold'
                    : 'text-foreground/60'
                )}
              >
                {t(item.title as Any)}
              </Button>
            </Link>
          ))}
        </nav>
      )}

      <div className="relative z-[10000] shrink-0 md:hidden">
        <motion.button
          ref={triggerRef}
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2"
        >
          <PublicHeaderLogo minimized={minimized} />
        </motion.button>

        <PublicHeaderMobileNav
          isOpen={open}
          onOpenChange={setOpen}
          items={items}
          triggerRef={triggerRef}
        >
          {children}
        </PublicHeaderMobileNav>
      </div>
    </div>
  );
});

PublicHeaderMainNav.displayName = 'PublicHeaderMainNav';
