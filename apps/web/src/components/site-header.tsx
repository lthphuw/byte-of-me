'use client';

import { CSSProperties } from 'react';
import { useElementSize, useWindowScroll } from '@mantine/hooks';
import { motion, type Transition } from 'framer-motion';
import { useTheme } from 'next-themes';

import { globalConfig } from '@/config/global';
import { cn } from '@/lib/utils';

import { ChatButton } from './chat-button';
import { I18NToggle } from './i18n-toggle';
import { MainNav } from './main-nav';
import { ModeToggle } from './mode-toggle';


const SCROLL_THRESHOLD = 50;
const COMPACT_BORDER_RADIUS = 16;
const COMPACT_TOP_OFFSET = 32;
const COMPACT_X_OFFSET = 48;
const COMPACT_WIDTH_OFFSET = 48;
const COMPACT_HEIGHT = 56;
const DEFAULT_HEIGHT = 64;
const COMPACT_PADDING = '12px 16px';
const DEFAULT_PADDING = '16px';
const SHADOW_TRANSITION_THRESHOLD = 10;
const COMPACT_CHAT_BUTTON_X_OFFSET = 200;

const TRANSITION: Transition = {
  type: 'spring',
  stiffness: 100,
  mass: 0.6,
  damping: 10,
};

export function SiteHeader() {
  const [{ y: scrollY }] = useWindowScroll();
  const { width: headerWidth, ref: mainNavRef } = useElementSize();
  const { resolvedTheme } = useTheme();

  const isCompact = scrollY >= SCROLL_THRESHOLD;
  const compactWidth = headerWidth
    ? `calc(${headerWidth}px + ${COMPACT_WIDTH_OFFSET}px)`
    : '100%';

  const shadowOpacity = (Math.min(scrollY / SHADOW_TRANSITION_THRESHOLD, 1) * 0.1);

  const boxShadow = (() => {
    const color = resolvedTheme === 'dark' ? '255,255,255' : '0,0,0';
    const opacity =
      resolvedTheme === 'dark'
        ? Math.min(shadowOpacity + 0.05, 0.15)
        : shadowOpacity;

    return `0 4px 10px rgba(${color},${opacity})`;
  })() as CSSProperties['boxShadow'];

  const controllerBoxShadow = isCompact ? boxShadow : 'none';

  return (
    <>
      <motion.header
        animate={{
          width: isCompact ? compactWidth : '100%',
          left: isCompact ? COMPACT_X_OFFSET : 0,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          boxShadow: scrollY > 0 ? boxShadow : 'none',
        }}
        className={cn(
          'fixed left-0 top-0 pl-2 z-50 w-full appearance-none overflow-hidden will-change-[width,transform] [-webkit-appearance:none]',
          isCompact && 'mr-auto pl-0 container-bg'
        )}
        transition={{
          top: TRANSITION,
          left: TRANSITION,
          borderRadius: TRANSITION,
          boxShadow: TRANSITION,
          width: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
        }}
      >
        <motion.div
          layout
          animate={{
            scale: isCompact ? 0.9 : 1,
            opacity: isCompact ? 0.95 : 1,
            borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl overflow-hidden',
            isCompact
              ? 'py-1 px-2 md:py-3 md:px-4'
              : `${DEFAULT_PADDING} md:ml-12`
          )}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
          }}
          transition={TRANSITION}
        >
          <MainNav
            ref={mainNavRef}
            items={globalConfig.header.nav}
            minimized={isCompact}
          />
        </motion.div>
      </motion.header>

      {/* Chat button */}
      <motion.div
        layout
        className={cn(
          'hidden md:block fixed top-0 right-32 bg-transparent md:right-32 z-50 space-x-2 appearance-none [-webkit-appearance:none]',
          isCompact && 'ml-auto pl-0 gradient-bg'
        )}
        animate={{
          right: isCompact ? COMPACT_CHAT_BUTTON_X_OFFSET : 132,
          top: isCompact ? COMPACT_TOP_OFFSET : 0,
          borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
        }}
        transition={TRANSITION}
      >
        <ChatButton
          className={isCompact ? 'py-1 px-2 md:py-3 md:px-4' : 'md:px-4'}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
          }}
        />
      </motion.div>

      {/* Controllers */}
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
        transition={TRANSITION}
      >
        <motion.div
          layout
          animate={{
            scale: isCompact ? 0.9 : 1,
            opacity: isCompact ? 0.95 : 1,
            borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 1,
          }}
          className={cn(
            'flex items-center gap-2 rounded-2xl justify-end',
            isCompact ? 'py-1 px-2 md:py-3 md:px-4' : 'md:px-4'
          )}
          style={{
            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
          }}
          transition={TRANSITION}
        >
          <ModeToggle />
          <I18NToggle />
        </motion.div>
      </motion.div>
    </>
  );
}
