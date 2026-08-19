'use client';

import { type MouseEvent,useCallback } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import { Button } from './button';
import { useClipboard } from './hooks/index';
import { Icons } from './icons';
import { cn } from './lib/utils';
// Straight at the token modules, not `./motion` — its barrel pulls in
// MotionProvider and framer-motion's full feature set.
import { springTransition } from './motion/transitions';
import { iconSwitchVariants } from './motion/variants';

export interface CopyButtonProps {
  copyTimeout?: number;
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CopyButton({
  copyTimeout = 2000,
  content,
  className,
  style,
}: CopyButtonProps) {
  const { copy, copied } = useClipboard({ timeout: copyTimeout });

  const handleCopy = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      copy(content);
    },
    [copy, content]
  );

  return (
    <Button
      type={'button'}
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      className={cn(
        'relative h-8 w-8 rounded-md transition-all duration-300',
        // copied && 'border-green-500/50 bg-green-500/10 text-green-600'
        className
      )}
      style={style}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={copied ? 'check' : 'copy'}
          variants={iconSwitchVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springTransition}
          className="flex items-center justify-center"
        >
          {copied ? (
            <Icons.check size={14} className="stroke-[3]" />
          ) : (
            <Icons.copy size={14} />
          )}
        </m.div>
      </AnimatePresence>
    </Button>
  );
}
