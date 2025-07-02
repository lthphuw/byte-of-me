'use client';

import { Link } from '@/i18n/navigation';
import { MainNavItem } from '@/types';
import {
  FloatingPortal,
  autoUpdate,
  offset,
  useFloating,
  useFocus,
  useInteractions,
} from '@floating-ui/react';
import { Variants, motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useSelectedLayoutSegment } from 'next/navigation';
import * as React from 'react';

import { Icons } from '@/components/icons';
import { MobileNav } from '@/components/mobile-nav';
import { siteConfig } from '@/config/site';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { iconVariants } from '@/config/anim';

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

const MainNav = React.forwardRef<HTMLDivElement, MainNavProps>(
  ({ items, children, minimized = false }, ref) => {
    const locale = useLocale();
    const isMobile = useIsMobile();
    const t = useTranslations('global.header.nav');
    const segment = useSelectedLayoutSegment();
    const [showMobileMenu, setShowMobileMenu] = React.useState(false);
    const [originPosition, setOriginPosition] = React.useState({ x: 0, y: 0 });

    const { update, refs, floatingStyles, context } = useFloating({
      open: showMobileMenu,
      onOpenChange: setShowMobileMenu,
      strategy: 'fixed',
      middleware: [offset({ mainAxis: 10, crossAxis: 10 })],
      whileElementsMounted: autoUpdate
    });

    const { getReferenceProps, getFloatingProps } = useInteractions([useFocus(context)]);

    const iconRef = React.useRef<SVGSVGElement | null>(null);

    const handleToggleMenu = React.useCallback(() => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setOriginPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
      setShowMobileMenu((prev) => !prev);
    }, []);

    return (
      <div ref={ref} className="flex gap-6 md:gap-10">
        {/* Desktop Logo */}
        {!isMobile && (
          <Link href="/" locale={locale} className="flex items-center space-x-2">
            <motion.div
              initial="initial"
              animate={minimized ? 'minimized' : 'initial'}
              variants={logoAnimVariants}
              className="flex items-center gap-2 will-change-transform"
            >
              <Icons.logo />
              <span className="hidden font-bold sm:inline-block">{siteConfig.name}</span>
            </motion.div>
          </Link>
        )}

        {/* Desktop Navigation */}
        {!isMobile && items.length > 0 && (
          <nav className="flex gap-6">
            {items.map((item, index) => (
              <Link
                key={index}
                href={item.disabled ? '#' : item.href}
                locale={locale}
                className={cn(
                  'flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm',
                  item.href.startsWith(`/${segment}`) ? 'text-foreground' : 'text-foreground/60',
                  item.disabled && 'cursor-not-allowed opacity-80'
                )}
              >
                {t(item.title)}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobile Menu Toggle and Portal */}
        {isMobile && (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleMenu}
              ref={refs.setReference}
              {...getReferenceProps()}
              className="relative flex items-center space-x-2 md:hidden"
            >
              <motion.span className="relative size-6">
                <motion.div
                  variants={iconVariants}
                  animate={showMobileMenu ? 'open' : 'closed'}
                >
                  <Icons.close ref={iconRef} className="absolute inset-0 size-6" />
                </motion.div>
                <motion.div
                  variants={iconVariants}
                  animate={showMobileMenu ? 'closed' : 'open'}
                >
                  <Icons.logo className="absolute inset-0 size-6" />
                </motion.div>
              </motion.span>
              <span className="font-bold">Menu</span>
            </motion.button>

            <FloatingPortal>
              <MobileNav
                isOpen={showMobileMenu}
                onOpenChange={setShowMobileMenu}
                originPosition={originPosition}
                items={items}
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
              >
                {children}
              </MobileNav>
            </FloatingPortal>
          </>
        )}
      </div>
    );
  }
);

MainNav.displayName = 'MainNav';

export { MainNav };
