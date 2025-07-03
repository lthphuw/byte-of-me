'use client';

import * as React from 'react';
import { Link } from '@/i18n/navigation';
import { MainNavItem } from '@/types';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { itemVariants } from '@/config/anim';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useLockBody } from '@/hooks/use-lock-body';
import { Icons } from '@/components/icons';

const TOP_OFFSET = 100;
const SIDE_OFFSET = '4vw';

interface MobileNavProps extends React.ComponentProps<typeof motion.div> {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  originPosition: { x: number; y: number };
  items: MainNavItem[];
  children?: React.ReactNode;
}

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.7, // Less drastic scaling
    y: -20, // Slight slide-up effect
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15,
      mass: 0.5,
      duration: 0.3,
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15,
      mass: 0.5,
      duration: 0.3,
      when: 'beforeChildren',
      staggerChildren: 0.1, // Slower stagger for deliberate effect
    },
  },
  exit: {
    opacity: 0,
    scale: 0.7,
    y: -20,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15,
      mass: 0.5,
      duration: 0.3,
    },
  },
};

export const MobileNav = React.forwardRef<HTMLDivElement, MobileNavProps>(
  (
    {
      items,
      children,
      isOpen,
      onOpenChange = () => {},
      originPosition,
      className,
      style,
      ...motionProps
    },
    ref
  ) => {
    useLockBody(isOpen);
    const t = useTranslations('global.header.nav');
    const transformOrigin = `${originPosition.x}px ${originPosition.y}px`;

    const positionOffset = {
      top: `calc(${style?.top || '0px'} + ${TOP_OFFSET}px)`,
      left: SIDE_OFFSET,
      right: SIDE_OFFSET,
    };

    const handleClose = React.useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={handleClose}
            />
            <motion.div
              ref={ref}
              className={cn(
                'fixed z-50 grid grid-flow-row auto-rows-max overflow-auto rounded-2xl shadow-2xl md:hidden',
                'container-bg',
                className
              )}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                ...style,
                ...positionOffset,
                transformOrigin,
                maxWidth: 'calc(100vw - 8vw)',
                left: 48,
                right: 48,
              }}
              {...motionProps}
            >
              <motion.div
                className="relative z-20 grid gap-6 p-4 text-popover-foreground"
                variants={{
                  visible: { transition: { staggerChildren: 0.1 } },
                }}
              >
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center space-x-2"
                >
                  <motion.div
                    key="logo"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <Icons.logo className="size-6" />
                  </motion.div>
                  <span className="font-bold">{siteConfig.name}</span>
                </Link>

                <nav className="grid grid-flow-row auto-rows-max text-sm">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.href + index}
                      custom={index}
                      variants={itemVariants}
                    >
                      <Link
                        href={item.disabled ? '#' : item.href}
                        onClick={handleClose}
                        className={cn(
                          'flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline',
                          item.disabled && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        {t(item.title as any)}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {children}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

MobileNav.displayName = 'MobileNav';
