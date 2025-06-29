'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { useTheme } from 'next-themes';

import { useTranslations } from '@/hooks/use-translations';

import { Icons } from './icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export interface TocItem {
  href: string;
  label: string;
}

interface FloatingTocProps {
  items: TocItem[];
}

const panelVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export function FloatingToc({ items }: FloatingTocProps) {
  const t = useTranslations('global');
  const { resolvedTheme: theme } = useTheme();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: 'absolute',
    middleware: [offset(12), flip(), shift()],
    placement: 'left',
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  const shadowClass =
    theme === 'dark'
      ? 'shadow-[0_4px_24px_rgba(255,255,255,0.06)]'
      : 'shadow-xl';

  return (
    <>
      {/* Docked TOC indicator */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`container-bg fixed right-3 md:right-12 top-1/3 z-60 flex flex-col items-center cursor-pointer rounded-xl px-[6px] py-[6px] md:px-2 md:py-2 transition-all ${shadowClass}`}
      >
        <TooltipProvider delayDuration={0.3}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="all-[unset] px-3 py-2 bg-blue-500 text-white rounded">
                <div className="flex flex-col items-center justify-center">
                  {items.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="my-1.5 h-6 w-6 flex items-center justify-center text-sm hover:text-blue-600 transition-colors duration-200 italic"
                    >
                      -
                    </Link>
                  ))}
                  <Icons.toc className="mt-2 h-5 w-5 text-gray-500" />
                </div>
              </button>
            </TooltipTrigger>

            <TooltipContent sideOffset={16} side="top">
              <div>
                <p>{t('Table of Content')}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Full TOC popup */}
      <AnimatePresence>
        {open && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 !m-0"
          >
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`rounded-lg container-bg shadow-2xl ${shadowClass}`}
            >
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.1,
                }}
                className="w-56 md:w-72 max-h-[80vh] overflow-y-auto px-4 py-5"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100 mb-4">
                  {t('Table of Content')}
                </h3>
                <ul className="space-y-3 text-sm">
                  {items.map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
