'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useLockBody } from '@byte-of-me/ui-hooks';
import { staggerItem, staggerStep } from '@byte-of-me/ui-motion';
import { AnimatePresence, m, stagger, type Variants } from 'framer-motion';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { MainNavItem } from '@/shared/types';

// No `opacity` here: the panel used to be frosted glass, and an ancestor with
// opacity < 1 broke its backdrop blur until the spring settled. The panel is
// solid now; the entrance stays scale + y so it looks the same as before.
const createContainerVariants = (itemCount: number): Variants => ({
  hidden: { scale: 0.95, y: -10 },
  visible: {
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delayChildren: stagger(staggerStep(itemCount)),
    },
  },
  // A short ease-in tween, not the entrance spring: a spring keeps settling after it looks
  // finished and held the panel on screen, so dismissing felt like waiting for the navigation.
  // Transform only, as the entrance: an opacity fade would make the panel a backdrop root.
  exit: {
    scale: 0.95,
    y: -10,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
});

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
  const containerVariants = React.useMemo(
    () => createContainerVariants(items.length),
    [items.length]
  );

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

    // `pointerdown`, not `mousedown`: on touch the mouse events are synthesized only after the
    // gesture resolves, so a tap outside waited on that round trip. Also covers mouse and pen.
    document.addEventListener('pointerdown', handleClickOutside);
    return () =>
      document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen, onOpenChange, triggerRef]);
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        // top: 3.5rem = the island's bottom (48px on mobile in BOTH states: AT_REST_MOBILE 0+48,
        // DOCKED_MOBILE 6+42, equal on purpose) + 8px gap; change either geometry and this changes.
        // Plus `env(safe-area-inset-top)`: the header sits that much lower on a notched iPhone.
        <m.div
          className="pointer-events-none fixed inset-x-0 z-[9999] md:hidden"
          style={{
            top: 'calc(3.5rem + env(safe-area-inset-top))',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight:
              'calc(var(--scrollbar-lock, 0px) + env(safe-area-inset-right))',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="container">
            <div
              ref={menuRef}
              className="pointer-events-auto overflow-hidden rounded-xl border border-border p-1.5 shadow-xl container-bg"
            >
              <div className="grid gap-1">
                {/* No gap between rows: the 8px separation guards small side-by-side buttons, and a
                    full-width row is its own target, so it reads as a list, not as separate cards. */}
                <nav className="grid">
                  {/* `staggerItem` has no `exit`: on the way out only the panel
                      animates, so the menu leaves as one object instead of the
                      links blanking first and the empty panel lingering. */}
                  {items.map((item, index) => (
                    <m.div key={item.href + index} variants={staggerItem}>
                      <Link
                        href={item.disabled ? '#' : item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          // 36px: stacked rows with no gap cannot grow a hit area, so the row is the target.
                          'flex h-9 w-full items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent',
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
