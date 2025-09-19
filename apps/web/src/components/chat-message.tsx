'use client';

import { useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { defaultSpring, iconSwicthVariants } from '@/config/anim';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/use-clipboard';
import { MessageContent } from '@/components/message-content';

import { Icons } from './icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLast: boolean;
}

export function ChatMessage({ role, content, isLast }: ChatMessageProps) {
  const t = useTranslations('chat');
  const { copy, copied } = useClipboard({ timeout: 2000 });
  const isUser = useMemo(() => role === 'user', []);
  const isSystem = useMemo(() => !isUser, [isUser]);

  const onCopy = useCallback(() => copy(content), [content]);

  return (
    <div
      className={cn(
        'relative group w-full flex flex-col',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {/* Message bubble */}
      <section
        className={cn(
          'prose dark:prose-invert px-3 py-2 text-sm',
          isSystem
            ? 'w-full min-w-full px-0'
            : isUser
            ? 'bg-neutral-200 shadow-md dark:bg-neutral-dark dark:shadow-2xl rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl rounded-br-lg max-w-[80%]'
            : 'bg-zinc-100 dark:bg-zinc-800 rounded-xl shadow-sm max-w-[85%]'
        )}
      >
        <MessageContent role={role} content={content} isLast={isLast} />
      </section>

      {/* Action bar*/}
      <div
        className={cn(
          'h-8 mt-1 flex items-center gap-2 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto',
          isUser ? 'justify-end self-end' : 'justify-start self-start'
        )}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative size-4">
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
            </TooltipTrigger>
            <TooltipContent sideOffset={4} side="bottom">
              <p>{t('Copy')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
