'use client';

import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useFocus,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';


import { itemVariants } from '@/config/anim';
import { cn, stripHtml } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Input } from '@/components/ui/input';
import Loading from '@/components/loading';


import { Icons } from './icons';


export interface SearchItem {
  id: string;
  label: string;
  slug: string;
  desc?: string;
}

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  previewItems?: SearchItem[];
  isLoading: boolean;
}

function highlightText(text: string, query: string) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <strong key={index} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
   )
  );
}

export function SearchBar({
                            searchQuery,
                            setSearchQuery,
                            previewItems = [],
                            isLoading,
                          }: SearchBarProps) {
  const t = useTranslations('global.search');

  const isOpen = previewItems.length > 0 && !!searchQuery;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: () => {},
    placement: 'bottom-start',
    middleware: [
      offset(8),
      flip(),
      shift(),
      size({
        apply({ availableHeight, elements }) {
          const ref = elements.reference.getBoundingClientRect();
          elements.floating.style.maxHeight = `${Math.min(
            400,
            availableHeight
          )}px`;
          elements.floating.style.width = `${ref.width}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useFocus(context, { enabled: previewItems.length > 0 }),
    useDismiss(context),
    useRole(context),
  ]);

  const renderedItems = useMemo(
    () =>
      previewItems.map((item, index) => {
        const labelParts = highlightText(item.label, searchQuery);

        const descText = item.desc ? stripHtml(item.desc) : '';
        const descParts = descText
          ? highlightText(descText, searchQuery)
          : null;

        return (
          <motion.div
            key={item.id}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-gray-800 focus:bg-gray-800 focus:outline-none',
            )}
          >
            <Link href={`/projects/${item.slug}`} className="block">
              <div className="line-clamp-1 font-medium tracking-wide text-gray-100">
                {labelParts}
              </div>

              {descParts && (
                <div className="line-clamp-1 text-xs text-gray-400">
                  {descParts}
                </div>
              )}
            </Link>
          </motion.div>
        );
      }),
    [previewItems, searchQuery]
  );

  return (
    <motion.div layout="position" className="relative mb-6">
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="relative"
      >
        <Icons.folderSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`${t('searchProjects')}...`}
          className="pl-10 pr-9"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Icons.spinner className="h-4 w-4 animate-spin" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-200 flex items-center justify-center"
            >
              <Icons.close className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 40 }}
              {...getFloatingProps()}
            >
              {
                isLoading ?
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="container-bg rounded-md p-2 shadow-lg h-20 flex items-center justify-center"
                  >
                    <Loading />
                  </motion.div>
                  :
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="container-bg rounded-md p-2 shadow-lg"
                  >
                    {renderedItems}
                  </motion.div>
              }
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  );
}
