'use client';

import type { ReactElement } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
 menuTransition, menuVariants } from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';

import { languageNames, supportedLanguages } from '@/shared/config/language';
import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import type { LocaleType } from '@/shared/types';

const flagVariants = {
  initial: { opacity: 0, scale: 0.9, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: -8 },
};

// Only these two flags exist in the UI, so they are served as two static
// files under public/flags (copied from the flag-icons package) instead of
// importing flag-icons.min.css — which drags all 257 flag classes plus every
// flag SVG (~550 files) into the build for the sake of two.
const flagClass =
  'inline-block w-[1.333333em] leading-[1em] bg-contain bg-center bg-no-repeat';

export const Flags: Record<
  LocaleType,
  (props: { className?: string }) => ReactElement
> = {
  vi: (props) => (
    <span
      role="img"
      aria-label="Tiếng Việt"
      className={cn(flagClass, 'border border-muted/20', props.className)}
      style={{ backgroundImage: "url('/flags/vn.svg')" }}
    />
  ),
  en: (props) => (
    <span
      role="img"
      aria-label="English"
      className={cn(flagClass, 'border border-muted/20', props.className)}
      style={{ backgroundImage: "url('/flags/gb.svg')" }}
    />
  ),
};

export function I18nToggle() {
  const t = useTranslations('global.i18nToggle');
  const locale = useLocale() as LocaleType;
  const pathname = usePathname();

  const CurrentFlag = Flags[locale];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {/* `min-h-11 min-w-11` below `md`: measured 36x36 on a phone, under
            §14's 44px minimum. See the same note on ColorSchemeModeToggle —
            only the hit area grows, the flag keeps its `size-6`. */}
        <Button
          variant="ghost"
          size="icon"
          className="relative flex size-10 min-h-11 min-w-11 items-center justify-center focus-visible:bg-accent focus-visible:ring-0 md:min-h-0 md:min-w-0"
        >
          <div className="relative flex size-6 items-center justify-center overflow-hidden rounded-sm">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={locale}
                variants={flagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CurrentFlag className="size-full object-cover shadow-sm" />
              </m.div>
            </AnimatePresence>
          </div>
          <span className="sr-only">{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[180px] overflow-hidden border-muted/50 bg-popover shadow-lg container-bg"
        forceMount
      >
        <AnimatePresence>
          <m.div
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={menuTransition}
          >
            {supportedLanguages.map((lang) => {
              const ItemFlag = Flags[lang];
              const isActive = lang === locale;

              return (
                <DropdownMenuItem key={lang} asChild>
                  <Link
                    href={pathname}
                    locale={lang}
                    className={cn(
                      'flex w-full items-center gap-3 px-2 py-2 rounded-md transition-colors cursor-pointer',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="size-5 shrink-0 overflow-hidden rounded-[2px] border border-muted/30">
                      <ItemFlag className="size-full object-cover" />
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm">
                        {t(languageNames[lang] as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                        {lang}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </m.div>
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
