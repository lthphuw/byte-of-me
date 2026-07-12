'use client';

import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
  iconSwitchVariants,
  menuTransition,
  menuVariants} from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { cn } from '@/shared/lib/utils';

export function ColorSchemeModeToggle() {
  const t = useTranslations('global.modeToggle');
  const { theme, setTheme, resolvedTheme } = useTheme();

  // `resolvedTheme` is undefined on the server but resolved from localStorage
  // on the client's first render — branching on it before mount causes a
  // hydration mismatch on every public page.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

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
            {!mounted ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <Icons.sun size={28} />
              </div>
            ) : (
            <AnimatePresence mode="wait" initial={false}>
              {resolvedTheme === 'light' ? (
                <m.div
                  key="sun"
                  variants={iconSwitchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icons.sun size={28} />
                </m.div>
              ) : (
                <m.div
                  key="moon"
                  variants={iconSwitchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icons.moon size={28} />
                </m.div>
              )}
            </AnimatePresence>
            )}
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
              <m.div
                custom={index}
                variants={menuVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={menuTransition}
              >
                <Icon className="mr-2 size-4" />
                <span>{item.label}</span>
              </m.div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
