'use client';

import {
  FloatingPortal,
  autoUpdate,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

export function ModeToggle() {
  const t = useTranslations('global.modeToggle');
  const { theme, setTheme } = useTheme();
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
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: 'spring' as const,
        stiffness: 130,
        damping: 10,
      },
    }),
    exit: { opacity: 0, y: 10 },
  };

  return (
    <motion.div layout style={{ position: 'relative' }}>
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant="icon"
        size="sm"
        className="relative size-9 px-0 focus:outline-none"
      >
        <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">{t('Toggle theme')}</span>
      </Button>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 60 }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 130, damping: 10 }}
                className={cn(
                  'glass-base',
                  'mt-0 min-w-[140px] rounded-md p-1 shadow-2xl'
                )}
              >
                {[
                  { theme: 'light', icon: Icons.sun, label: t('Light') },
                  { theme: 'dark', icon: Icons.moon, label: t('Dark') },
                  { theme: 'system', icon: Icons.laptop, label: t('System') },
                ].map((item, index) => (
                  <motion.div
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
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  );
}
