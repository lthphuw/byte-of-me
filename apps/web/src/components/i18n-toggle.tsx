'use client';

import { useCallback, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { FloatingPortal, autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale } from 'next-intl';



import { itemVariants } from '@/config/anim';
import { languageNames, supportedLanguages } from '@/config/language';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';



import { Flags } from './flag';


// Define flag animation variants
const flagVariants = {
  initial: { opacity: 0, scale: 0.8, y: 5 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: -5 },
};

export function I18NToggle() {
  const t = useTranslations('global.i18nToggle');
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const FlagComponent = Flags[locale];

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

  const handleLanguageChange = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant="link"
        size="icon"
        className="relative size-8 px-0 focus:outline-none"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.span className="relative size-6">
            <AnimatePresence initial={false}>
              <motion.div
                key={locale}
                variants={flagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                  type: 'spring',
                  stiffness: 150,
                  damping: 15,
                  duration: 0.2,
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <FlagComponent className="size-6 fi" />
              </motion.div>
            </AnimatePresence>
          </motion.span>
          <span className="sr-only">{t('Toggle language')}</span>
        </motion.div>
      </Button>

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <nav
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 60,
              }}
              {...getFloatingProps()}
            >
              <motion.ul
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
                    <motion.li
                      key={lang}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={cn(
                        'flex cursor-pointer items-center gap-2 text-sm transition-colors'
                      )}
                    >
                      <Link
                        href={pathname}
                        locale={lang}
                        onClick={handleLanguageChange}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-2 w-full',
                          {
                            'bg-muted text-primary': lang === locale,
                            'text-muted-foreground hover:bg-muted':
                              lang !== locale,
                          }
                        )}
                      >
                        <span className="relative size-5 flex items-center justify-center">
                          <Flag className="size-5 fi" />
                        </span>
                        <span>
                          {t(languageNames[lang])}{' '}
                          <span className="uppercase tracking-wide">
                            {lang}
                          </span>
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </nav>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
