'use client';

import { MouseEvent, useCallback } from 'react';
import { useClipboard } from '@mantine/hooks';
import { AnimatePresence, motion } from 'framer-motion';

import { defaultSpring, iconSwicthVariants } from '@/config/anim';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

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

  const onCopy = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      copy(content);
    },
    [copy, content]
  );

  return (
    <div
      className={cn(
        'relative flex items-center justify-center size-8 rounded-md bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors',
        className
      )}
      style={style}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.div
            key="check"
            variants={iconSwicthVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={defaultSpring}
            className="flex items-center justify-center text-green-600"
          >
            <Icons.check size={14} />
          </motion.div>
        ) : (
          <motion.button
            key="copy"
            variants={iconSwicthVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={defaultSpring}
            onClick={onCopy}
            className="flex items-center justify-center text-neutral-600 hover:text-neutral-900 focus:outline-none"
            aria-label="Copy to clipboard"
          >
            <Icons.copy size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
