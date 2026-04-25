'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { cn } from '@/shared/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
} from '@/shared/ui';
import {
  iconSwitchVariants,
  menuTransition,
  menuVariants,
} from '@/shared/ui/motion';

export function ColorSchemeModeToggle() {
  const t = useTranslations('global.modeToggle');
  const { theme, setTheme, resolvedTheme } = useTheme();

  const items = [
    { value: 'light', icon: Icons.sun, label: t('light') },
    { value: 'dark', icon: Icons.moon, label: t('dark') },
    { value: 'system', icon: Icons.laptop, label: t('system') },
  ];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 overflow-hidden p-0 focus-visible:ring-1"
        >
          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              {resolvedTheme === 'light' ? (
                <motion.div
                  key="sun"
                  variants={iconSwitchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icons.sun size={28} />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  variants={iconSwitchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icons.moon size={28} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-50 min-w-[160px] space-y-1 overflow-hidden rounded-md border border-muted/50 bg-popover  shadow-lg container-bg"
      >
        {items.map((item, index) => {
          const isActive = theme === item.value;
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.value || index}
              onClick={() => setTheme(item.value)}
              className={cn(
                'cursor-pointer flex items-center gap-2',
                isActive && 'bg-accent text-accent-foreground font-medium'
              )}
              asChild
            >
              <motion.div
                custom={index}
                variants={menuVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={menuTransition}
              >
                <Icon className="mr-2 size-4" />
                <span>{item.label}</span>
              </motion.div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
