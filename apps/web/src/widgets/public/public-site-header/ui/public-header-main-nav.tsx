'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { Routes } from '@/shared/config/global';
import { siteConfig } from '@/shared/config/site';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';
import { PublicHeaderMobileNav } from '@/widgets/public/public-site-header/ui/public-header-mobile-nav';





const HeaderLogo = React.memo(({ minimized }: { minimized: boolean }) => (
  <motion.div
    layout="position"
    className="flex items-center gap-2"
    transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
  >
    <Icons.logo />
    <div className="relative overflow-hidden whitespace-nowrap">
      <AnimatePresence mode="wait">
        <motion.span
          key={minimized ? 'short' : 'full'}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="block font-bold"
        >
          {minimized ? siteConfig.shortName : siteConfig.name}
        </motion.span>
      </AnimatePresence>
    </div>
  </motion.div>
));
HeaderLogo.displayName = 'HeaderLogo';

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
  const [originPosition, setOriginPosition] = React.useState({ x: 0, y: 0 });

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

  const navItems = React.useMemo(
    () => items.filter((it) => !it.onlyMobile),
    [items]
  );

  return (
    <div ref={ref} className="flex items-center gap-6 md:gap-10">
      <Link
        href={Routes.Homepage}
        locale={locale}
        className="hidden items-center md:flex"
      >
        <HeaderLogo minimized={minimized} />
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

      <div className="relative z-[10000] md:hidden">
        <motion.button
          layout
          onClick={handleToggleMenu}
          className="flex items-center gap-2"
        >
          <HeaderLogo minimized={minimized} />
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
});

PublicHeaderMainNav.displayName = 'PublicHeaderMainNav';
