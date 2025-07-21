'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  FloatingPortal,
  ReferenceType,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
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

interface DropdownOption {
  id: string;
  label: string;
  desc?: string;
  disabled?: boolean;
  disableReason?: string;
}

interface FilterSelectProps {
  items: DropdownOption[];
  selectedId: string;
  onSelect: (value: string) => void;
  useAllOption?: boolean;
  zIndex?: number;
  renderInBody?: boolean;
  equalWidth?: boolean;
}

const chevronVariants: Variants = {
  closed: { rotate: 0 },
  open: { rotate: 180 },
};

export const FilterSelect: React.FC<FilterSelectProps> = ({
  items,
  selectedId,
  onSelect,
  useAllOption = true,
  zIndex = 40,
  renderInBody = true,
  equalWidth = false,
}) => {
  const t = useTranslations('global.search');
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo<DropdownOption[]>(
    () => (useAllOption ? [{ id: '', label: t('All') }, ...items] : items),
    [items, useAllOption, t]
  );

  const selectedLabel = useMemo(
    () => options.find((item) => item.id === selectedId)?.label || t('All'),
    [selectedId, options, t]
  );

  const { refs, floatingStyles, context } = useFloating<ReferenceType>({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(12),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableWidth, elements }) {
          if (!equalWidth) {
            return;
          }

          elements.floating.style.width = `${Math.min(
            availableWidth,
            elements.reference.getBoundingClientRect().width
          )}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
    },
    [onSelect]
  );

  const DropdownTrigger = (
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
  );

  const DropdownMenu = (
    <nav
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className={cn(
        'container-bg rounded-xl shadow-lg max-h-[300px] overflow-y-auto w-[200px]',
        `z-${zIndex}`
      )}
    >
      <motion.ul
        initial={{ opacity: 0.3, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 120, damping: 10 }}
        className="container-bg mt-0 min-w-[160px] rounded-md p-1 shadow-2xl"
      >
        {options.map((item, index) => (
          <motion.li
            key={item.id}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileTap={{ scale: 0.97 }}
            onClick={() => !item.disabled && handleSelect(item.id)}
            className={cn(
              'flex flex-col gap-1 cursor-pointer items-stretch rounded-md px-3 py-3 text-sm transition-colors min-h-[48px]',
              selectedId === item.id
                ? 'bg-muted text-primary'
                : 'text-muted-foreground hover:bg-muted',
              item.disabled && 'pointer-events-none'
            )}
          >
            <p
              className={cn(
                'text-sm sm:text-base line-clamp-1',
                item.disabled && 'line-through'
              )}
            >
              {item.label}
            </p>
            {item.desc && (
              <p
                className={cn(
                  'text-xs sm:text-sm opacity-90 line-clamp-2',
                  item.disabled && 'line-through'
                )}
              >
                {item.desc}
              </p>
            )}

            {item.disableReason && (
              <p
                className={cn(
                  'text-xs sm:text-sm opacity-90 line-clamp-2 font-bold'
                )}
              >
                {item.disableReason}
              </p>
            )}
          </motion.li>
        ))}
      </motion.ul>
    </nav>
  );

  return (
    <>
      {DropdownTrigger}
      {isOpen &&
        (renderInBody ? (
          <FloatingPortal>{DropdownMenu}</FloatingPortal>
        ) : (
          DropdownMenu
        ))}
    </>
  );
};
