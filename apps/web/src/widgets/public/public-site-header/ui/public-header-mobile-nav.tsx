'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { itemVariants } from '@/shared/config/anim';
import { useLockBody } from '@/shared/hooks/use-lock-body';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';

interface PublicHeaderMobileNavProps
  extends React.ComponentProps<typeof motion.div> {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  originPosition: { x: number; y: number };
  items: MainNavItem[];
  children?: React.ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15,
      mass: 0.5,
      staggerChildren: 0.08,
    },
  },
  exit: { opacity: 0, scale: 0.7, y: -20 },
};

export const PublicHeaderMobileNav = ({
  items,
  children,
  isOpen,
  onOpenChange = () => {},
  originPosition,
}: PublicHeaderMobileNavProps) => {
  useLockBody(isOpen);
  const t = useTranslations('global.header.nav');

  const handleClose = () => onOpenChange(false);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={handleClose}
          />

          {/* Menu */}
          <motion.div
            className="fixed z-[9999] rounded-2xl shadow-2xl container-bg md:hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              top: originPosition.y ? originPosition.y + 45 : 80,
              left: 32,
              right: 32,
              maxWidth: 'calc(100vw - 32px)',
              transformOrigin: `${originPosition.x}px ${originPosition.y}px`,
            }}
          >
            <div className="grid gap-6 p-4 text-popover-foreground">
              <nav className="grid gap-2 text-sm">
                {items.map((item, index) => (
                  <motion.div key={item.href + index} variants={itemVariants}>
                    <Link
                      href={item.disabled ? '#' : item.href}
                      onClick={handleClose}
                      className={cn(
                        'flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline',
                        item.disabled && 'opacity-60'
                      )}
                    >
                      {t(item.title as any)}
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
