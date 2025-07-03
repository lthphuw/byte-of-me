'use client';

import { useState } from 'react';
import {
  FloatingPortal,
  autoUpdate,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';

import { itemVariants } from '@/config/anim';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

// Define icon animation variants
const iconVariants = {
  initial: { opacity: 0, scale: 0.8, rotate: 90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.8, rotate: -90 },
};

export function ModeToggle() {
  const t = useTranslations('global.modeToggle');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: 'absolute',
    placement: 'bottom-end',
    middleware: [offset(4)],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant="icon"
        size="sm"
        className="relative size-9 px-0 focus-visible:outline-none"
      >
        <motion.span
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.span className="relative size-6">
            <AnimatePresence initial={false}>
              {resolvedTheme === 'light' ? (
                <motion.div
                  key="sun"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 150,
                    damping: 15,
                    duration: 0.2,
                  }}
                  className="absolute inset-0"
                >
                  <Icons.sun className="size-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 150,
                    damping: 15,
                    duration: 0.2,
                  }}
                  className="absolute inset-0"
                >
                  <Icons.moon className="size-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.span>
          <span className="sr-only">{t('Toggle theme')}</span>
        </motion.span>
      </Button>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <nav
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 60 }}
              {...getFloatingProps()}
            >
              <motion.ul
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 130, damping: 10 }}
                className={cn(
                  'container-bg',
                  'mt-0 min-w-[140px] rounded-md p-1 shadow-2xl'
                )}
              >
                {[
                  { theme: 'light', icon: Icons.sun, label: t('Light') },
                  { theme: 'dark', icon: Icons.moon, label: t('Dark') },
                  { theme: 'system', icon: Icons.laptop, label: t('System') },
                ].map((item, index) => (
                  <motion.li
                    key={item.theme}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => setTheme(item.theme)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      theme === item.theme
                        ? 'bg-muted text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="mr-2 size-4" />
                    <span>{item.label}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </nav>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
