'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

import { globalConfig } from '@/config/global';
import { cn } from '@/lib/utils';
import { useCompactHeader } from '@/hooks/use-compact-header';
import { useElementDimensions } from '@/hooks/use-element-dimension';
import { useWindowScroll } from '@/hooks/use-window-scroll';

import { I18NToggle } from './i18n-toggle';
import { LiquidGlass } from './liquid-glass';
import { MainNav } from './main-nav';
import { ModeToggle } from './mode-toggle';

const controlVariants = {
  compact: {
    scale: 0.9,
    opacity: 0.95,
  },
  default: {
    scale: 1,
    opacity: 1,
  },
};

export function SiteHeader() {
  const [{ y: scrollY }] = useWindowScroll();
  const { dimensions: headerDimensions, ref: headerRef } =
    useElementDimensions<HTMLDivElement>();
  const { width: headerWidth } = headerDimensions ?? {};
  const { resolvedTheme: theme } = useTheme();
  const {
    isCompact,
    animationControls,
    transitionConfig,
    constants: {
      COMPACT_X_OFFSET,
      COMPACT_BORDER_RADIUS,
      COMPACT_TOP_OFFSET,
      COMPACT_PADDING,
      DEFAULT_PADDING,
      COMPACT_HEIGHT,
      DEFAULT_HEIGHT,
    },
  } = useCompactHeader(scrollY, headerWidth);

  // State to manage theme styles on the client
  const [clientThemeStyles, setClientThemeStyles] = useState('shadow-md');

  useEffect(() => {
    // Update theme styles only on the client
    setClientThemeStyles(
      cn(
        theme === 'dark'
          ? 'shadow-[0_4px_20px_rgba(255,255,255,0.08)]'
          : 'shadow-md',
        isCompact && theme !== 'dark' && 'shadow-xl'
      )
    );
  }, [theme, isCompact]);

  return (
    <>
      <motion.header
        initial={false}
        className={cn(
          'fixed left-0 top-0 z-50 w-full',
          clientThemeStyles, // Use client-side theme styles
          isCompact && 'mr-auto pl-0'
        )}
        animate={animationControls}
      >
        {/* Rest of your header code */}
        <LiquidGlass
          variant="panel"
          intensity="strong"
          disableRipple={!isCompact}
          disableHoverCursor={!isCompact}
          disableStretch
          className="relative flex flex-row items-center"
          disabled={!isCompact}
        >
          <motion.div
            className={cn(
              'flex w-fit items-center justify-between rounded-2xl',
              isCompact
                ? 'py-1 px-2 md:py-3 md:px-4'
                : `${DEFAULT_PADDING} md:ml-12`
            )}
            animate={{
              height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
              padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
            }}
            transition={transitionConfig}
            ref={headerRef}
          >
            <MainNav items={globalConfig.header.nav} minimized={isCompact} />
          </motion.div>
        </LiquidGlass>
      </motion.header>

      <motion.div
        className={cn(
          `fixed top-0 right-12 z-50 space-x-2`,
          isCompact && `ml-auto ${clientThemeStyles}`
        )}
        animate={{
          left: 'auto',
          right: isCompact ? COMPACT_X_OFFSET : 48,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 0,
          transition: { ease: ['easeOut'] },
        }}
        transition={transitionConfig}
      >
        <LiquidGlass
          variant="panel"
          intensity="strong"
          disableRipple={!isCompact}
          disableHoverCursor={!isCompact}
          disableStretch
          className="relative flex flex-row items-center"
          disabled={!isCompact}
        >
          <motion.div
            className={cn(
              'flex items-center gap-2 rounded-2xl justify-end',
              clientThemeStyles, // Apply clientThemeStyles here
              isCompact ? 'py-1 px-2 md:py-3 md:px-4' : `px-4`
            )}
            animate={{
              height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
              borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 0,
            }}
            transition={transitionConfig}
          >
            <div className="flex items-center gap-2">
              <motion.div
                variants={controlVariants}
                animate={isCompact ? 'compact' : 'default'}
                transition={transitionConfig}
              >
                <ModeToggle liquidGlassDisabled={!isCompact} />
              </motion.div>
              <motion.div
                variants={controlVariants}
                animate={isCompact ? 'compact' : 'default'}
                transition={transitionConfig}
              >
                <I18NToggle liquidGlassDisabled={!isCompact} />
              </motion.div>
            </div>
          </motion.div>
        </LiquidGlass>
      </motion.div>
    </>
  );
}
