'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { itemVariants } from '@/shared/config/anim';
import { Routes } from '@/shared/config/global';
import { useLockBody } from '@/shared/hooks/use-lock-body';
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
  minimized?: boolean;
}


export const PublicHeaderMobileNav = ({
  items,
  children,
  isOpen,
  onOpenChange = () => {},
                                        minimized,
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
        <>
          <motion.div
            ref={menuRef}
            className={
            cn(
              "fixed inset-x-8 z-[9999] overflow-hidden rounded-2xl border border-border p-4 shadow-xl backdrop-blur-xl container-bg md:hidden",
              minimized ? 'top-24' : 'top-16'
            )
            }
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="grid gap-4">
              <nav className="grid gap-1">
                {items.map((item, index) => (
                  <motion.div key={item.href + index} variants={itemVariants}>
                    <Link
                      href={item.disabled ? '#' : item.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                        item.href.startsWith(`/${segment}`) || (!segment && item.href === Routes.Homepage)
                          ? 'text-foreground font-semibold'
                          : 'text-foreground/60'
                      )}
                    >
                      {t(item.title as Any)}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
