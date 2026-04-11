'use client';

import * as React from 'react';
import { iconSwicthVariants, itemVariants } from '@/shared/config/anim';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Icons } from '@/shared/ui/icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

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
          className="relative size-10 p-0 focus-visible:ring-1 overflow-hidden"
        >
          <div className="relative">
            <AnimatePresence mode="wait" initial={true}>
              {resolvedTheme === 'light' ? (
                <motion.div
                  key="sun"
                  variants={iconSwicthVariants}
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
                  variants={iconSwicthVariants}
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
        className="min-w-[160px] z-50 overflow-hidden space-y-1 bg-popover rounded-md border border-muted/50 shadow-lg"
      >
        {items.map((item, index) => {
          const isActive = theme === item.value;
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.value}
              onClick={() => setTheme(item.value)}
              className={cn(
                'cursor-pointer flex items-center gap-2',
                isActive && 'bg-accent text-accent-foreground font-medium'
              )}
              asChild
            >
              <motion.div
                custom={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex w-full items-center"
              >
                <Icon className="size-4 mr-2" />
                <span>{item.label}</span>
              </motion.div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
