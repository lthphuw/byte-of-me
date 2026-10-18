'use client';

import type { ReactElement } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  menuTransition,
} from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';

import { languageNames } from '@/shared/config/language';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/utils';
import type { LocaleType } from '@/shared/types';
import {
  DEFAULT_MENU_PLACEMENT,
  type MenuPlacement,
} from '@/shared/ui/menu-placement';

const flagVariants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -8 },
};

// Only two flags exist in the UI: static files under public/flags, not flag-icons.min.css
// (it drags all 257 flag classes and ~550 SVGs into the build). The SVGs are 640x480, so
// the box is 4:3 and a caller sets only its height: a square box drew the border around a gap.
const flagClass =
  'inline-block aspect-[4/3] border border-border bg-cover bg-center bg-no-repeat';

const Flags: Record<
  LocaleType,
  (props: { className?: string }) => ReactElement
> = {
  vi: (props) => (
    <span
      role="img"
      aria-label="Tiếng Việt"
      className={cn(flagClass, props.className)}
      style={{ backgroundImage: "url('/flags/vn.svg')" }}
    />
  ),
  en: (props) => (
    <span
      role="img"
      aria-label="English"
      className={cn(flagClass, props.className)}
      style={{ backgroundImage: "url('/flags/gb.svg')" }}
    />
  ),
};

/**
 * Switches the interface language. Each option is a real `Link`, not a router call:
 * it is navigation (middle-click works) and next-intl writes the locale cookie.
 */
export function I18nToggle({
  side = DEFAULT_MENU_PLACEMENT.side,
  align = DEFAULT_MENU_PLACEMENT.align,
}: MenuPlacement = {}) {
  const t = useTranslations('global.i18nToggle');
  const locale = useLocale() as LocaleType;
  const pathname = usePathname();

  const CurrentFlag = Flags[locale];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {/* The Button owns the touch strip and its focus ring; the 24px
            mark matches the theme toggle beside it. */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <div className="relative flex size-6 items-center justify-center overflow-hidden rounded-sm">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={locale}
                variants={flagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={menuTransition}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CurrentFlag className="h-[18px] rounded-[2px]" />
              </m.div>
            </AnimatePresence>
          </div>
          <span className="sr-only">{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="min-w-44"
      >
        {/* No framer layer here: the content's own Radix enter/exit is the one
            animation. A spring inside it doubled the zoom (0.95 x 0.95). */}
        {routing.locales.map((lang) => {
          const ItemFlag = Flags[lang];

          return (
            <DropdownMenuItem key={lang} asChild>
              <Link
                href={pathname}
                locale={lang}
                className={cn(
                  'w-full gap-3',
                  lang === locale &&
                    'bg-accent font-medium text-accent-foreground'
                )}
              >
                <ItemFlag className="h-[15px] shrink-0 rounded-[2px]" />
                <span>{t(languageNames[lang])}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
