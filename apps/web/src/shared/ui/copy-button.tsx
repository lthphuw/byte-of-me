'use client';

import { useClipboard } from '@mantine/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { type MouseEvent,useCallback } from 'react';

import { defaultSpring, iconSwicthVariants } from '@/shared/config/anim';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

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
      variant="outline"
      size="icon"
      onClick={handleCopy}
      className={cn(
        'relative size-8 rounded-md transition-colors duration-200',
        copied
          ? 'bg-muted text-muted-foreground border-muted-foreground/20'
          : 'bg-background text-foreground',
        className
      )}
      style={style}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
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
            className="flex items-center justify-center"
          >
            <Icons.check size={14} className="text-muted-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            variants={iconSwicthVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={defaultSpring}
            className="flex items-center justify-center"
          >
            <Icons.copy size={14} />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
