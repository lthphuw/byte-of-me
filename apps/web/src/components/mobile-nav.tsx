'use client';

import * as React from 'react';
import Link from 'next/link';
import { MainNavItem } from '@/types';
import { AnimatePresence, Variants, motion } from 'framer-motion';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useLockBody } from '@/hooks/use-lock-body';
import { Icons } from '@/components/icons';

const TOP_OFFSET = 100;
const SIDE_OFFSET = 16;

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
    scale: 0.3,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
      delay: 0.1,
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      duration: 0.3,
      ease: 'easeOut',
      when: 'beforeChildren',
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
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

    const transformOrigin = `${originPosition.x}px ${originPosition.y}px`;

    const positionOffset = {
      top: `calc(${style?.top || '0px'} + ${TOP_OFFSET}px)`,
      left: `calc(${style?.left || '0px'} + ${SIDE_OFFSET}px)`,
      right: `${SIDE_OFFSET}px`,
    };

    const handleClose = React.useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            className={cn(
              'fixed z-50 grid grid-flow-row auto-rows-max overflow-auto rounded-2xl shadow-2xl md:hidden',
              'glass-base',
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
              left: 48,
              right: 48,
            }}
            {...motionProps}
          >
            <motion.div
              className="relative z-20 grid gap-6 p-4 text-popover-foreground"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <Link
                href="/"
                onClick={handleClose}
                className="flex items-center space-x-2"
              >
                <motion.div
                  key="logo"
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
                  <motion.div key={index} variants={itemVariants}>
                    <Link
                      href={item.disabled ? '#' : item.href}
                      onClick={handleClose}
                      className={cn(
                        'flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline',
                        item.disabled && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {item.title}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

MobileNav.displayName = 'MobileNav';
