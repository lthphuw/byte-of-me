'use client';

import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import {
  FloatingPortal,
  autoUpdate,
  flip,
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
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Input } from '@/components/ui/input';

import { Icons } from './icons';

export interface SearchItem {
  id: string;
  label: string;
  desc?: string;
}

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  previewItems?: SearchItem[];
  isLoading: boolean;
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
    strategy: 'absolute',
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

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <strong key={index} className="font-bold">
          {part}
        </strong>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };


  const renderedItems = useMemo(
    () =>
      previewItems.map((item, index) => {
        const labelParts = highlightText(item.label, searchQuery);
        const descParts = item.desc
          ? highlightText(item.desc, searchQuery)
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
              'hover:bg-gray-800',
              'focus:bg-gray-800 focus:outline-none'
            )}
          >
            <Link href={`/projects/${item.id}`} className="block">
              <div className="tracking-wide font-medium line-clamp-1">
                {labelParts}
              </div>
              {descParts && (
                <div className="text-sm text-gray-500 line-clamp-1">
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
        <Icons.folderSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`${t('Search projects')}...`}
          className="pl-10 pr-9"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Icons.spinner className="h-4 w-4 animate-spin" />
          ) : searchQuery ? (
            <button onClick={() => setSearchQuery('')}>
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
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={'container-bg shadow-lg rounded-md p-2'}
            >
                {renderedItems}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  );
}
