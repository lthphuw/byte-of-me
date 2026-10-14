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
} from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { cn } from '@/shared/lib/utils';
import {
  DEFAULT_MENU_PLACEMENT,
  type MenuPlacement,
} from '@/shared/ui/menu-placement';

/**
 * Light / dark / follow the system.
 *
 * In `shared/ui` because the dashboard and the public site both need it, and
 * a widget may not import from a sibling widget. Not stored in
 * `workspace_settings`: the theme must apply before first paint, which
 * next-themes' blocking script does and a database round trip cannot.
 */
export function ColorSchemeModeToggle({
  side = DEFAULT_MENU_PLACEMENT.side,
  align = DEFAULT_MENU_PLACEMENT.align,
}: MenuPlacement = {}) {
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
        {/* `[&_svg]:size-6` so the mark matches the 24px flag beside it: an
            `size={28}` attribute loses to the Button's own `[&_svg]:size-4`. */}
        <Button
          variant="ghost"
          size="icon"
          className="relative overflow-hidden p-0 [&_svg]:size-6"
        >
          <div className="relative">
            {!mounted ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <Icons.sun />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={resolvedTheme === 'light' ? 'sun' : 'moon'}
                  variants={iconSwitchVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={menuTransition}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {resolvedTheme === 'light' ? <Icons.sun /> : <Icons.moon />}
                </m.div>
              </AnimatePresence>
            )}
          </div>

          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="min-w-44"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => setTheme(item.value)}
            className={cn(
              'cursor-pointer',
              theme === item.value &&
                'bg-accent font-medium text-accent-foreground'
            )}
          >
            <item.icon />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
