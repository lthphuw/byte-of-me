'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
// Subpath, not the package barrel: this widget renders in the header of every
// public page, and the barrel reaches the rich text editor.
import { useLockBody } from '@byte-of-me/ui/hooks/use-lock-body';
import { AnimatePresence, m, type Variants } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';

// Deliberately no `opacity` here. The panel below carries `backdrop-blur-xl`,
// and an ancestor with opacity < 1 becomes a backdrop root: the blur then
// samples only what is painted *inside* that root — nothing — so the frosted
// glass stayed flat until the spring settled and opacity hit exactly 1. That
// read as the menu blurring half a second after the tap. Transform alone does
// not create a backdrop root, so scale + y keep the entrance without the bug.
const containerVariants: Variants = {
  hidden: { scale: 0.95, y: -10 },
  visible: {
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
    },
  },
  // A short ease-in tween, NOT the entrance spring. A spring keeps settling
  // long after it looks finished, and the panel stayed on screen through it —
  // which is what made dismissing the menu feel like it was waiting for the
  // navigation rather than responding to the tap. Same principle the
  // collapsible keyframes already follow: enter eases out, exit eases in and
  // runs shorter.
  //
  // Transform only, deliberately, for the same reason the entrance carries no
  // opacity (see below): fading the panel makes it a backdrop root and the
  // frosted glass would flatten on the way out.
  exit: {
    scale: 0.95,
    y: -10,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

/**
 * The entrance stagger, without an exit.
 *
 * The shared `itemVariants` carries `exit: { opacity: 0, y: 10 }`, and on the
 * way out the container's `staggerChildren` walked the links through it one by
 * one while the panel itself was still leaving — the links blanked first and
 * the empty panel lingered behind them. Omitting `exit` here leaves the panel
 * as the only thing that animates out, so the menu departs as one object.
 *
 * Local rather than a change to the shared variant, which other surfaces use
 * for entrances where its exit is fine.
 */
const linkVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 130, damping: 10 },
  },
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

    const handleClickOutside = (event: PointerEvent) => {
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

    // `pointerdown`, not `mousedown`: on touch the mouse events are compatibility
    // events the browser synthesizes only after the gesture resolves, so a tap
    // outside the panel waited on that round trip before anything happened.
    // `pointerdown` fires on the touch itself and covers mouse and pen too.
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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
            {/* `gap-2`, not `gap-1`: 4px between two 44px targets is half of
                §14's minimum separation, and a mis-tap here navigates. */}
            <nav className="grid gap-2">
              {items.map((item, index) => (
                <m.div key={item.href + index} variants={linkVariants}>
                  <Link
                    href={item.disabled ? '#' : item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      // `min-h-11`: `px-3 py-2` around a 20px line box is a
                      // 36px row, and this panel is a touch-only surface —
                      // §14's 44px minimum applies to it before anything else
                      // in the header.
                      'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
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
