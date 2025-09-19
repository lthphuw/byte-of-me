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
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';

import { Icons } from './icons';

export interface SearchItem {
  id: string;
  label: string;
  desc?: string;
}

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onItemSelect?: (item: SearchItem) => void;
  previewItems?: SearchItem[];
  isLoading: boolean;
  setIsLoading: (flag: boolean) => void;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 130,
      damping: 10,
    },
  }),
  exit: { opacity: 0, y: 10 },
};

export function SearchBar({
  searchQuery,
  setSearchQuery,
  previewItems = [],
  isLoading,
  setIsLoading,
  onItemSelect,
}: SearchBarProps) {
  const t = useTranslations('global.search');
  const debouncedQuery = useDebounce(searchQuery, 400);

  const isOpen = previewItems.length > 0 && !!debouncedQuery;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: () => {},
    strategy: 'absolute',
    placement: 'bottom-start',
    middleware: [
      offset(12),
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
        const labelParts = highlightText(item.label, debouncedQuery);
        const descParts = item.desc
          ? highlightText(item.desc, debouncedQuery)
          : null;

        return (
          <motion.div
            key={item.id}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => onItemSelect?.(item)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-gray-100 hover:text-gray-900',
              'focus:bg-gray-100 focus:text-gray-900 focus:outline-none'
            )}
          >
            <Link
              href={`/projects/${item.id}`}
              className="tracking-wide font-medium line-clamp-1"
            >
              {labelParts}
              {descParts && (
                <>
                  <span className="mx-1">|</span>
                  {descParts}
                </>
              )}
            </Link>
          </motion.div>
        );
      }),
    [previewItems, debouncedQuery, onItemSelect]
  );

  return (
    <motion.div layout="position" className="relative mb-6">
      {/* Input */}
      <div
        className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] rounded-xl overflow-hidden w-full"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <Icons.folderSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          placeholder={`${t('Search projects')}...`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsLoading(true);
          }}
          className="px-10 py-3 h-full w-full rounded-xl"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <Icons.spinner className="animate-spin h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>

      {/* Preview Result list */}
      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 40 }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 130, damping: 10 }}
                className={'container-bg shadow-lg'}
              >
                <div className="mt-0 min-w-[160px] rounded-md p-1 text-sm">
                  {renderedItems}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  );
}
