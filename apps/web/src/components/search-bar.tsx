'use client';

import { useCallback, useEffect, useState } from 'react';
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

import { cn } from '@/lib/utils';
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(previewItems.length > 0 && !!searchQuery);
  }, [previewItems, searchQuery]);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    strategy: 'absolute',
    placement: 'bottom-start',
    middleware: [
      offset(12),
      flip(),
      shift(),
      size({
        apply({ availableHeight, elements }) {
          const ref = elements.reference.getBoundingClientRect();
          const maxHeight = `${Math.min(400, availableHeight)}px`;
          const width = ref.width;
          elements.floating.style.maxHeight = maxHeight;
          elements.floating.style.width = `${width}px`;
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

  // Function to highlight search query in text
  const highlightText = useCallback(
    (text: string, query: string) => {
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
    },
    [searchQuery]
  );

  // Function to display a search item with highlighted query
  const displayItem = useCallback(
    (item: SearchItem) => {
      const labelParts = highlightText(item.label, searchQuery);
      const descParts = item.desc
        ? highlightText(item.desc, searchQuery)
        : null;
      return (
        <>
          {labelParts}
          {descParts && (
            <>
              <span className="mx-1">|</span>
              {descParts}
            </>
          )}
        </>
      );
    },
    [searchQuery, highlightText]
  );

  return (
    <motion.div layout="position" className="relative mb-6">
      {/* Input with glass & shadow */}
      <div
        className="glass-base shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] rounded-xl overflow-hidden w-full"
        style={{ willChange: 'transform, opacity, backdrop-filter' }}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <Icons.folderSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsLoading(true); // Set loading state when query changes
          }}
          className="px-10 py-3 h-full w-full rounded-xl"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <svg
              className="animate-spin h-4 w-4 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {/* Result list popup */}
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
              >
                <div className="glass-base shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)] mt-0 min-w-[160px] rounded-md border-none p-1 text-sm">
                  {previewItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => {
                        onItemSelect?.(item);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        'hover:bg-gray-100 hover:text-gray-900',
                        'focus:bg-gray-100 focus:text-gray-900 focus:outline-none'
                      )}
                    >
                      <span className="tracking-wide font-medium line-clamp-1">
                        {displayItem(item)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  );
}
