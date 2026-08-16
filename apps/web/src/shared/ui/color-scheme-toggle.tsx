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
  menuVariants,
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
 * Snappy on purpose. The old spring (stiffness 150, damping 15) is ζ≈0.6 —
 * underdamped, ~0.5s to settle plus an overshoot, so picking a theme looked
 * like the button was thinking about it. ζ≈0.75 arrives in about half that.
 */
const ICON_SWAP = { type: 'spring', stiffness: 400, damping: 30 } as const;

/**
 * Light / dark / follow the system.
 *
 * In `shared/ui` because the dashboard and the notes workspace need it too, and
 * a widget may not import from a sibling widget. Not stored in
 * `workspace_settings`: the theme must apply before first paint, which
 * next-themes' blocking script does and a database round trip cannot.
 */
export function ColorSchemeModeToggle({
  side = DEFAULT_MENU_PLACEMENT.side,
  align = DEFAULT_MENU_PLACEMENT.align,
  menuClassName,
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
        {/* No hover fill below `md`: a ghost background is a pointer
            affordance, and on a phone it only ever flashed grey under a finger.
            The 44x44 box stays, invisible — that is §14's touch target, and
            shrinking it to match how small this now looks is the trade the rule
            exists to prevent.

            `[&_svg]:size-6` because the mark rendered at 16px next to a 24px
            flag. It asked for `size={28}`, but that sets an attribute and the
            variant's own `[&_svg]:size-4` is a descendant selector, so CSS won.
            Matching the flag also closes most of the apparent gap between them:
            what reads as space between two icons is mostly box padding. */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 min-h-11 min-w-11 overflow-hidden p-0 hover:bg-transparent focus-visible:ring-1 md:min-h-0 md:min-w-0 md:hover:bg-accent [&_svg]:size-6"
        >
          <div className="relative">
            {!mounted ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <Icons.sun />
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
                    transition={ICON_SWAP}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Icons.sun />
                  </m.div>
                ) : (
                  <m.div
                    key="moon"
                    variants={iconSwitchVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={ICON_SWAP}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Icons.moon />
                  </m.div>
                )}
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
        className={cn(
          'z-50 min-w-[160px] space-y-2 overflow-hidden rounded-md border border-muted/50 bg-popover shadow-lg container-bg',
          menuClassName
        )}
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
