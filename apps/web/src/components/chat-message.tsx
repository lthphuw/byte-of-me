'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { CopyButton } from '@/components/copy-button';
import { MessageContent } from '@/components/message-content';

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
  const isUser = useMemo(() => role === 'user', []);
  const isSystem = useMemo(() => !isUser, [isUser]);

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
              <CopyButton content={content} />
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
