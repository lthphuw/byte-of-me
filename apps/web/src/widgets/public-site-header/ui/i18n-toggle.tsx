'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { itemVariants } from '@/shared/config/anim';
import { languageNames, supportedLanguages } from '@/shared/config/language';
import { cn } from '@/shared/lib/utils';
import { LocaleType } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';

const flagVariants = {
  initial: { opacity: 0, scale: 0.9, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: -8 },
};

export const Flags: Record<LocaleType, any> = {
  vi: (props: any) => (
    <span className={cn('fi fi-vn border border-muted/20', props.className)} />
  ),
  en: (props: any) => (
    <span className={cn('fi fi-gb border border-muted/20', props.className)} />
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
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 flex items-center justify-center focus-visible:ring-0 focus-visible:bg-accent"
        >
          <div className="relative size-6 flex items-center justify-center overflow-hidden rounded-sm">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={locale}
                variants={flagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CurrentFlag className="size-full object-cover shadow-sm" />
              </motion.div>
            </AnimatePresence>
          </div>
          <span className="sr-only">{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[180px] p-1.5 overflow-hidden space-y-1 bg-popover rounded-md border border-muted/50 shadow-lg"
      >
        {supportedLanguages.map((lang, index) => {
          const ItemFlag = Flags[lang];
          const isActive = lang === locale;

          return (
            <motion.div
              key={index}
              custom={index}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex w-full items-center"
            >
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
                      {t(languageNames[lang] as any)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                      {lang}
                    </span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </motion.div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
