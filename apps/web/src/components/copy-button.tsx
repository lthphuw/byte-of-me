'use client';

import { useCallback } from 'react';
import { BaseComponentProps } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';

import { defaultSpring, iconSwicthVariants } from '@/config/anim';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/use-clipboard';
import { Icons } from '@/components/icons';





export type CopyButtonProps = BaseComponentProps & {
  copyTimeout?: number;
  content: string;
}

export function CopyButton({copyTimeout = 2000 , content, className, style}:CopyButtonProps) {
  const { copy, copied } = useClipboard({ timeout: copyTimeout });
  const onCopy = useCallback(() => copy(content), [content]);

  return (
    <div className={cn('relative size-4', className)} style={style}>
      <AnimatePresence initial={false}>
        {copied ? (
          <motion.button
            key="check"
            variants={iconSwicthVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={defaultSpring}
            className="absolute inset-0"
          >
            <Icons.check size={16} />
          </motion.button>
        ) : (
          <motion.button
            key="copy"
            variants={iconSwicthVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={defaultSpring}
            onClick={onCopy}
            className="absolute inset-0"
          >
            <Icons.copy size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
