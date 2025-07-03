'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  FloatingPortal,
  ReferenceType,
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
import { Variants, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { itemVariants } from '@/config/anim';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  label: string;
}

interface FilterSelectProps {
  items: Item[];
  selectedFilter: string;
  setSelectedFilter: (value: string) => void;
}

const chevronVariants: Variants = {
  closed: { rotate: 0 },
  open: { rotate: 180 },
};

export const FilterSelect: React.FC<FilterSelectProps> = ({
  items,
  selectedFilter,
  setSelectedFilter,
}) => {
  const t = useTranslations('global.search');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Memoize allItems to avoid recalculation
  const allItems = useMemo(
    () => [
      {
        id: '',
        label: t('All'),
      },
      ...items,
    ],
    [items, t]
  );

  // Memoize selectedLabel
  const selectedLabel = useMemo(
    () => items.find((t) => t.id === selectedFilter)?.label || t('All'),
    [items, selectedFilter, t]
  );

  // Optimize Floating UI with conditional autoUpdate
  const { refs, floatingStyles, context } = useFloating<ReferenceType>({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(12), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, {
        animationFrame: false,
        ancestorScroll: true,
        ancestorResize: true,
        elementResize: true,
      }),
    placement: 'bottom-end',
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { escapeKey: true });
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Memoize handleSelect to prevent recreation
  const handleSelect = useCallback(
    (value: string): void => {
      setSelectedFilter(value);
      setIsOpen(false);
    },
    [setSelectedFilter]
  );

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="container-bg shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.04)] w-full rounded-xl cursor-pointer flex items-center justify-between p-3"
      >
        <span className="line-clamp-1 text-sm">{selectedLabel}</span>
        <motion.div
          variants={chevronVariants}
          animate={isOpen ? 'open' : 'closed'}
          transition={{
            type: 'spring',
            stiffness: 180,
            damping: 12,
            duration: 0.2,
          }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>

      {isOpen && (
        <FloatingPortal>
          <nav
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="container-bg rounded-xl shadow-lg max-h-[300px] overflow-y-auto w-[200px] z-50"
          >
            <motion.ul
              initial={{ opacity: 0.3, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 120, damping: 10 }}
              className={cn(
                'container-bg',
                'mt-0 min-w-[140px] rounded-md p-1 shadow-2xl'
              )}
            >
              {allItems.map((it, index) => (
                <motion.li
                  key={it.id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={() => handleSelect(it.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    selectedFilter === it.id
                      ? 'bg-muted text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {it.label}
                </motion.li>
              ))}
            </motion.ul>
          </nav>
        </FloatingPortal>
      )}
    </>
  );
};
