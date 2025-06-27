'use client';

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
import { useSelectedLayoutSegment } from 'next/navigation';
import * as React from 'react';

import { Icons } from '@/components/icons';
import { MobileNav } from '@/components/mobile-nav';
import { siteConfig } from '@/config/site';
import { useTranslations } from '@/hooks/use-translations';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

interface MainNavProps {
  items?: MainNavItem[];
  children?: React.ReactNode;
  minimized?: boolean;
}

const logoAnimVariants: Variants = {
  minimized: {
    scale: 0.9,
    x: 0,
    opacity: 0.95,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 10,
      mass: 0.4,
    },
  },
  initial: {
    scale: 1,
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 10,
      mass: 0.4,
    },
  },
};

export function MainNav({ items, children, minimized }: MainNavProps) {
  const locale = useLocale();

  const t = useTranslations('global.header.nav');
  const segment = useSelectedLayoutSegment();
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [originPosition, setOriginPosition] = React.useState({ x: 0, y: 0 });
  const { update, refs, elements, floatingStyles, context } = useFloating({
    open: showMobileMenu,
    onOpenChange: setShowMobileMenu,
    strategy: 'fixed',
    transform: true,
    middleware: [offset({ mainAxis: 10, crossAxis: 10 })],
    whileElementsMounted: autoUpdate,
  });

  const focus = useFocus(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([focus]);

  const iconRef = React.useRef<SVGSVGElement | null>(null);

  const handleToggleMenu = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setOriginPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    setShowMobileMenu((prev) => !prev);
  };

  React.useEffect(() => {
    if (showMobileMenu && elements.reference && elements.floating) {
      return autoUpdate(elements.reference, elements.floating, update);
    }
  }, [elements, update, showMobileMenu]);

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" locale={locale} className="hidden items-center space-x-2 md:flex">
        <motion.div
          variants={logoAnimVariants}
          animate={minimized ? 'minimized' : 'initial'}
          className="hidden items-center gap-2 md:flex"
        >
          <Icons.logo />
          <span className="hidden font-bold sm:inline-block">
            {siteConfig.name}
          </span>
        </motion.div>
      </Link>

      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items.map((item, index) => (
            <Link
              locale={locale}
              key={index}
              href={item.disabled ? '#' : item.href}
              className={cn(
                'flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm',
                item.href.startsWith(`/${segment}`)
                  ? 'text-foreground'
                  : 'text-foreground/60',
                item.disabled && 'cursor-not-allowed opacity-80'
              )}
            >
              {t(item.title as any)}
            </Link>
          ))}
        </nav>
      ) : null}

      <button
        className="flex items-center space-x-2 md:hidden"
        ref={refs.setReference}
        onClick={handleToggleMenu}
        {...getReferenceProps()}
      >
        {showMobileMenu ? (
          <Icons.close ref={iconRef} className="size-6" />
        ) : (
          <Icons.logo ref={iconRef} className="size-6" />
        )}
        <span className="font-bold">Menu</span>
      </button>

      <FloatingPortal>
        {items && (
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
        )}
      </FloatingPortal>
    </div>
  );
}
