'use client';

import type {Variants } from 'framer-motion';
import { motion } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { iconOpenCloseVariants } from '@/shared/config/anim';
import { Routes } from '@/shared/config/global';
import { siteConfig } from '@/shared/config/site';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';
import { PublicHeaderMobileNav } from '@/widgets/public-site-header/ui/public-header-mobile-nav';

interface MainNavProps {
  items: MainNavItem[];
  children?: React.ReactNode;
  minimized?: boolean;
}

const logoAnimVariants: Variants = {
  minimized: {
    scale: 1,
    x: 0,
    opacity: 0.95,
    transition: { type: 'spring', stiffness: 130, damping: 10, mass: 0.4 },
  },
  initial: {
    scale: 1,
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 130, damping: 10, mass: 0.4 },
  },
};

export const PublicHeaderMainNav = React.forwardRef<HTMLDivElement, MainNavProps>(
  ({ items, children, minimized = false }, ref) => {
    const locale = useLocale();
    const t = useTranslations('global.header.nav');
    const segment = useSelectedLayoutSegment();

    const [open, setOpen] = React.useState(false);
    const [originPosition, setOriginPosition] = React.useState({ x: 0, y: 0 });

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const navItems = items.filter((it) => !it.onlyMobile);

    const handleToggleMenu = React.useCallback(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setOriginPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
      setOpen((prev) => !prev);
    }, []);

    return (
      <div ref={ref} className="flex items-center gap-6 md:gap-10">
        {/* Logo */}
        <Link
          href={Routes.Homepage}
          locale={locale}
          className="hidden items-center space-x-2 md:flex"
        >
          <motion.div
            initial="initial"
            animate={minimized ? 'minimized' : 'initial'}
            variants={logoAnimVariants}
            className="flex items-center gap-2 will-change-transform"
          >
            <Icons.logo />
            <span className="hidden font-bold sm:inline-block">
              {siteConfig.name}
            </span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        {navItems.length > 0 && (
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = item.href && item.href.startsWith(`/${segment}`);

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? '#' : item.href}
                  locale={locale}
                  className={cn(
                    'flex items-center transition-colors',
                    item.disabled && 'cursor-not-allowed opacity-80'
                  )}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'text-md font-medium',
                      isActive
                        ? 'text-foreground font-semibold'
                        : 'text-foreground/60 hover:text-foreground/80'
                    )}
                  >
                    {t(item.title as any)}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Mobile Navigation */}
        <div className="relative z-[10000] md:hidden">
          <motion.button
            ref={triggerRef}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleMenu}
            className="flex items-center gap-2"
          >
            <motion.span className="relative size-6">
              <motion.div
                variants={iconOpenCloseVariants}
                animate={open ? 'open' : 'closed'}
              >
                <Icons.close className="absolute inset-0 size-6" />
              </motion.div>
              <motion.div
                variants={iconOpenCloseVariants}
                animate={open ? 'closed' : 'open'}
              >
                <Icons.logo className="absolute inset-0 size-6" />
              </motion.div>
            </motion.span>

            <span className="font-bold">Byte Of Me</span>
          </motion.button>

          <PublicHeaderMobileNav
            isOpen={open}
            onOpenChange={setOpen}
            originPosition={originPosition}
            items={items}
          >
            {children}
          </PublicHeaderMobileNav>
        </div>
      </div>
    );
  }
);

PublicHeaderMainNav.displayName = 'MainNav';
