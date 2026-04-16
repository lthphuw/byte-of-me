'use client';

import { type MouseEvent,useCallback } from 'react';
import { defaultSpring, iconSwicthVariants } from '@/shared/config/anim';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

import { useClipboard } from '@mantine/hooks';
import { AnimatePresence, motion } from 'framer-motion';

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
        <motion.div
          key={copied ? 'check' : 'copy'}
          variants={iconSwicthVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={defaultSpring}
          className="flex items-center justify-center"
        >
          {copied ? (
            <Icons.check size={14} className="stroke-[3]" />
          ) : (
            <Icons.copy size={14} />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
