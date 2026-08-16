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

/**
 * Light / dark / follow the system.
 *
 * In `shared/ui` rather than beside the public header it was written for,
 * because the dashboard and the notes workspace need the same control and a
 * widget may not import from a sibling widget. Until this moved, the theme
 * could only be changed from the marketing site — every authenticated surface
 * inherited whatever choice was made out there and offered no way to change it.
 *
 * The state lives in `next-themes`, which is mounted at the app root, so this
 * works from any route with nothing else to wire up. Deliberately NOT stored in
 * `workspace_settings` with the editor preferences: the theme has to be applied
 * before the first paint to avoid a flash of the wrong one, which is what
 * next-themes' blocking script does and a database round trip cannot.
 */
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
        {/* `min-h-11 min-w-11` below `md`: the rendered control measured 36x36
            on a phone (`h-9 w-9` from the icon size wins over `size-10` — the
            `size-*` utility ships before `h-*`/`w-*` in Tailwind's output, and
            tailwind-merge v1 does not know the utility to collapse them), under
            §14's 44px minimum. `min-*` rather than a bigger `size-*` so the
            desktop box and the icon are both left alone, and the island's
            `gap-2` keeps the 8px separation. */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 min-h-11 min-w-11 overflow-hidden p-0 focus-visible:ring-1 md:min-h-0 md:min-w-0"
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
        className="z-50 min-w-[160px] space-y-2 overflow-hidden rounded-md border border-muted/50 bg-popover  shadow-lg container-bg"
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
