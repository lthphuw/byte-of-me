'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { FlagType } from '@/types';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { useLocale } from 'next-intl';

import { languageNames, supportedLanguages } from '@/config/language';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';

import { Flags } from './flag';

export function I18NToggle() {
  const mounted = useMounted();
  const t = useTranslations('global.i18nToggle');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<FlagType>('en');

  const FlagComponent = Flags[currentLang];

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    strategy: 'absolute',
    placement: 'bottom-end',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context),
  ]);

  const changeLanguage = useCallback(
    (newLang: FlagType) => {
      setCurrentLang(newLang);
      setIsOpen(false);
      router.replace(pathname, { locale: newLang });
    },
    [router, pathname]
  );

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

  useEffect(() => {
    setCurrentLang(locale);
  }, [locale]);

  return (
    <>
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant="icon"
        size="sm"
        className="overflow-y-hidden relative size-9 px-0 focus:outline-none"
      >
        <AnimatePresence mode="sync">
          {FlagComponent && (
            <motion.span
              layout="position"
              key={currentLang}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <FlagComponent className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="sr-only">{t('Toggle language')}</span>
      </Button>

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 60,
              }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 130, damping: 10 }}
                className={cn(
                  'mt-0 min-w-[160px] rounded-md p-1 shadow-2xl overflow-hidden',
                  'container-bg'
                )}
              >
                {supportedLanguages.map((lang, index) => {
                  const Flag = Flags[lang];
                  return (
                    <motion.div
                      key={lang}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => changeLanguage(lang)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        lang === locale
                          ? 'bg-muted text-primary'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Flag className="size-5" />
                      <span>
                        {t(languageNames[lang])}{' '}
                        <span className="uppercase tracking-wide">{lang}</span>
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
