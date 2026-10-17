'use client';

import { useClipboard } from '@byte-of-me/ui-hooks';
import { iconSwitchVariants, menuTransition } from '@byte-of-me/ui-motion';
import { AnimatePresence, m } from 'framer-motion';

import { Button } from './button';
import { Icons } from './icons';

export function CopyButton({
  content,
  label,
  copiedLabel,
  className,
}: {
  content: string;
  /** Accessible name before the copy; this package has no i18n context. */
  label: string;
  /** Accessible name after it. */
  copiedLabel: string;
  className?: string;
}) {
  const { copy, copied } = useClipboard();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copy(content);
      }}
      className={className}
      aria-label={copied ? copiedLabel : label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={copied ? 'check' : 'copy'}
          variants={iconSwitchVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={menuTransition}
          className="flex items-center justify-center"
        >
          {copied ? <Icons.check className="stroke-[3]" /> : <Icons.copy />}
        </m.span>
      </AnimatePresence>
    </Button>
  );
}
