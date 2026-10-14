'use client';

import { AnimatePresence, m } from 'framer-motion';

import { Button } from './button';
import { useClipboard } from './hooks/use-clipboard';
import { Icons } from './icons';
// Straight at the token modules, not `./motion` — its barrel pulls in
// MotionProvider and framer-motion's full feature set.
import { menuTransition } from './motion/transitions';
import { iconSwitchVariants } from './motion/variants';

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
        copy(content);
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
