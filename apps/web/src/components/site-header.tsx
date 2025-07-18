'use client';

import { useMemo } from 'react';
import { Variants, motion, type Transition } from 'framer-motion';
import { useTheme } from 'next-themes';

import { globalConfig } from '@/config/global';
import { cn } from '@/lib/utils';
import { useElementDimensions } from '@/hooks/use-element-dimension';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useWindowScroll } from '@/hooks/use-window-scroll';

import { ChatButton } from './chat-button';
import { I18NToggle } from './i18n-toggle';
import { MainNav } from './main-nav';
import { ModeToggle } from './mode-toggle';

const SCROLL_THRESHOLD = 50;
const COMPACT_BORDER_RADIUS = 16;
const COMPACT_TOP_OFFSET = 32;
const COMPACT_X_OFFSET = 48;
const COMPACT_WIDTH_OFFSET = 48; // extra width of header content, avoid to collapse the text
const COMPACT_HEIGHT = 56;
const DEFAULT_HEIGHT = 64;
const COMPACT_PADDING = '12px 16px';
const DEFAULT_PADDING = '16px';
const SHADOW_TRANSITION_THRESHOLD = 10;

const COMPACT_CHAT_BUTTON_X_OFFSET = 200;

export function SiteHeader() {
  const [{ y: scrollY }] = useWindowScroll(200);
  const { dimensions: headerDimensions, ref: mainNavRef } =
    useElementDimensions<HTMLDivElement>();
  const { width: headerWidth } = headerDimensions ?? {};
  const { resolvedTheme: theme } = useTheme();
  const isMobile = useIsMobile();

  const isCompact = useMemo(() => scrollY >= SCROLL_THRESHOLD, [scrollY]);

  const compactWidth = useMemo(() => {
    return headerWidth
      ? `calc(${headerWidth}px + ${COMPACT_WIDTH_OFFSET}px)`
      : '100%';
  }, [headerWidth, isMobile]);

  const shadowOpacity = useMemo(() => {
    const progress = Math.min(scrollY / SHADOW_TRANSITION_THRESHOLD, 1);
    return progress * 0.1;
  }, [scrollY]);

  const boxShadow = useMemo(() => {
    const color = theme === 'dark' ? '255,255,255' : '0,0,0';
    const opacity =
      theme === 'dark' ? Math.min(shadowOpacity + 0.05, 0.15) : shadowOpacity;
    return `0 4px 10px rgba(${color},${opacity})`;
  }, [theme, shadowOpacity, isCompact]);

  const controllerBoxShadow = useMemo(
    () => (isCompact ? boxShadow : 'none'),
    [isCompact, boxShadow]
  );

  const headerStyle = useMemo(
    () =>
      ({
        '--header-width': isCompact ? compactWidth : '100%',
      } as React.CSSProperties),
    [isCompact, compactWidth]
  );

  const transitionConfig: Transition = {
    type: 'spring',
    stiffness: 100,
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
        transition={{
          top: transitionConfig,
          left: transitionConfig,
          borderRadius: transitionConfig,
          boxShadow: transitionConfig,
          width: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
        }}
      >
        <motion.div
          layout
          variants={controlVariants}
          animate={isCompact ? 'compact' : 'full'}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl overflow-hidden',
            isCompact
              ? 'py-1 px-2 md:py-3 md:px-4'
              : `${DEFAULT_PADDING} md:ml-12`
          )}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
            borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          }}
          transition={transitionConfig}
        >
          <MainNav
            items={globalConfig.header.nav}
            minimized={isCompact}
            ref={mainNavRef}
          />
        </motion.div>
      </motion.header>

      {/* Chat button */}
      <motion.div
        layout
        className={cn(
          'hidden md:block fixed top-0 right-32 bg-transparent md:right-32 z-50 space-x-2 appearance-none [-webkit-appearance:none]',
          isCompact && 'ml-auto pl-0  gradient-bg'
        )}
        animate={{
          right: isCompact ? COMPACT_CHAT_BUTTON_X_OFFSET : 132,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
        }}
        transition={transitionConfig}
      >
        <motion.button
          layout
          variants={controlVariants}
          animate={isCompact ? 'compact' : 'full'}
          className={cn('flex items-center gap-2 rounded-2xl justify-end')}
          transition={transitionConfig}
        >
          <ChatButton
            className={isCompact ? 'py-1 px-2 md:py-3 md:px-4' : 'md:px-4'}
            style={{
              height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
            }}
          />
        </motion.button>
      </motion.div>

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
