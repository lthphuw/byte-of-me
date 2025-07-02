'use client';

import { motion, Variants, type Transition } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';

import { globalConfig } from '@/config/global';
import { useElementDimensions } from '@/hooks/use-element-dimension';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useWindowScroll } from '@/hooks/use-window-scroll';
import { cn } from '@/lib/utils';

import { I18NToggle } from './i18n-toggle';
import { MainNav } from './main-nav';
import { ModeToggle } from './mode-toggle';

const SCROLL_THRESHOLD = 50;
const COMPACT_BORDER_RADIUS = 16;
const COMPACT_TOP_OFFSET = 32;
const COMPACT_X_OFFSET = 48;
const COMPACT_WIDTH_OFFSET = 38; // Padding of header content
const COMPACT_HEIGHT = 56;
const DEFAULT_HEIGHT = 64;
const COMPACT_PADDING = '12px 16px';
const DEFAULT_PADDING = '16px';
const SHADOW_TRANSITION_THRESHOLD = 10;

export function SiteHeader() {
  const [{ y: scrollY }] = useWindowScroll();
  const { dimensions: headerDimensions, ref: mainNavRef } = useElementDimensions<HTMLDivElement>();
  const { width: headerWidth } = headerDimensions ?? {};
  const { resolvedTheme: theme } = useTheme();
  const isMobile = useIsMobile();

  const isCompact = useMemo(() => scrollY >= SCROLL_THRESHOLD, [scrollY]);

  const compactWidth = useMemo(() => {
    return headerWidth ? `calc(${headerWidth}px + ${COMPACT_WIDTH_OFFSET}px)` : '100%';
  }, [headerWidth, isMobile]);

  const shadowOpacity = useMemo(() => {
    const progress = Math.min(scrollY / SHADOW_TRANSITION_THRESHOLD, 1);
    return progress * 0.1;
  }, [scrollY]);

  const boxShadow = useMemo(() => {
    const color = theme === 'dark' ? '255,255,255' : '0,0,0';
    const opacity = theme === 'dark' ? Math.min(shadowOpacity + 0.05, 0.15) : shadowOpacity;
    return `0 4px 10px rgba(${color},${opacity})`;
  }, [theme, shadowOpacity, isCompact]);

  const controllerBoxShadow = useMemo(() => isCompact ? boxShadow : 'none', [isCompact, boxShadow]);

  const headerStyle = useMemo(
    () => ({
      '--header-width': isCompact ? compactWidth : '100%',
    }) as React.CSSProperties,
    [isCompact, compactWidth]
  );

  const transitionConfig: Transition = isMobile
    ? {
      type: 'spring',
      bounce: 0.25,
      visualDuration: 0.4,
    }
    : {
      duration: 0.4,
      ease: 'easeOut',
    };

  const headerVariants: Variants = {
    compact: {
      width: 'var(--header-width)',
      left: COMPACT_X_OFFSET,
      top: COMPACT_TOP_OFFSET,
      borderRadius: COMPACT_BORDER_RADIUS,
      transition: transitionConfig,
    },
    full: {
      width: '100%',
      left: 0,
      top: 0,
      borderRadius: 1,
      transition: transitionConfig,
    },
  };

  const controlVariants: Variants = {
    compact: {
      scale: 0.9,
      opacity: 0.95,
      borderRadius: COMPACT_BORDER_RADIUS,
      transition: transitionConfig,
    },
    full: {
      scale: 1,
      opacity: 1,
      borderRadius: 0,
      transition: transitionConfig,
    },
  };

  return (
    <>
      <motion.header
        layout
        variants={headerVariants}
        animate={{
          width: isCompact ? compactWidth : '100%',
          left: isCompact ? COMPACT_X_OFFSET : 0,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          boxShadow: scrollY > 0 ? boxShadow : 'none',
        }}
        style={headerStyle}
        className={cn(
          'fixed left-0 top-0 pl-2 z-50 w-full appearance-none overflow-hidden will-change-[width,transform] [-webkit-appearance:none]',
          isCompact && 'mr-auto pl-0 container-bg'
        )}
        transition={transitionConfig}
      >
        <motion.div
          layout
          variants={controlVariants}
          animate={isCompact ? 'compact' : 'full'}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl overflow-hidden',
            isCompact ? 'py-1 px-2 md:py-3 md:px-4' : `${DEFAULT_PADDING} md:ml-12`,
          )}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
            borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          }}
          transition={transitionConfig}
        >
          <MainNav items={globalConfig.header.nav} minimized={isCompact} ref={mainNavRef} />
        </motion.div>
      </motion.header>

      <motion.div
        layout
        className={cn(
          'fixed top-0 right-6 bg-transparent md:right-12 z-50 space-x-2 appearance-none [-webkit-appearance:none]',
          isCompact && 'ml-auto pl-0 container-bg'
        )}
        animate={{
          right: isCompact ? COMPACT_X_OFFSET : 24,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          boxShadow: controllerBoxShadow,
        }}
        transition={transitionConfig}
      >
        <motion.div
          layout
          variants={controlVariants}
          animate={isCompact ? 'compact' : 'full'}
          className={cn(
            'flex items-center gap-2 rounded-2xl justify-end',
            isCompact ? 'py-1 px-2 md:py-3 md:px-4' : 'md:px-4'
          )}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
          }}
          transition={transitionConfig}
        >
          <div className="flex items-center gap-2">
            <ModeToggle />
            <I18NToggle />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}