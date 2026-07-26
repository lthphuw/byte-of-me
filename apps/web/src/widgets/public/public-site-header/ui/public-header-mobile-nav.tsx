'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { itemVariants,useLockBody  } from '@byte-of-me/ui';
import { AnimatePresence, m, type Variants } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0, scale: 0.95, y: -10 },
};

interface PublicHeaderMobileNavProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  items: MainNavItem[];
  children?: React.ReactNode;
}

export const PublicHeaderMobileNav = ({
  items,
  children,
  isOpen,
  onOpenChange = () => {},
  triggerRef,
}: PublicHeaderMobileNavProps) => {
  useLockBody(isOpen);
  const t = useTranslations('global.header.nav');
  const menuRef = React.useRef<HTMLDivElement>(null);
  const segment = useSelectedLayoutSegment();

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange, triggerRef]);
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        // top-[72px]: island bottom is 64px on mobile in both states, +8px gap.
        // The `container` shell aligns the panel with the page content column.
        <m.div
          className="pointer-events-none fixed inset-x-0 top-[72px] z-[9999] md:hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="container">
            <div
              ref={menuRef}
              className="pointer-events-auto overflow-hidden rounded-2xl border border-border p-4 shadow-xl backdrop-blur-xl container-bg"
            >
          <div className="grid gap-4">
            <nav className="grid gap-1">
              {items.map((item, index) => (
                <m.div key={item.href + index} variants={itemVariants}>
                  <Link
                    href={item.disabled ? '#' : item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                      item.href.startsWith(`/${segment}`) ||
                        (!segment && item.href === Routes.Homepage)
                        ? 'text-foreground font-semibold'
                        : 'text-foreground/60'
                    )}
                  >
                    {t(item.title as Parameters<typeof t>[0])}
                  </Link>
                </m.div>
              ))}
            </nav>
            {children}
          </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
