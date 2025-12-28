'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistantStore } from '@/stores/assistant';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { ModelSelector } from '@/components/model-selector';

import { Icons } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { toast } from './ui/use-toast';

const MAX_MESSAGE_LENGTH = 200; // Define max length constant

export type ChatInputProps = {
  onSend: (message: string) => void;
  className?: string;
};

export default function ChatInput({
  onSend,
  className,
}: ChatInputProps) {
  const t = useTranslations('chat');
  const {
    threadId,
    isRateLimited,
    llm,
    setLLM,
    embedding,
    setEmbedding,
    reranker,
    setReranker,
    isLoading,
    clearHistory,
  } = useAssistantStore();

  const [input, setInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || isLoading) return;

    if (message.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: 'Message too long',
        description: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    onSend(message);
    setInput('');
  }, [input, isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  return (
    <>
      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'w-full bg-white/80 dark:bg-black/30 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 md:p-4 shadow-md dark:shadow-[0_4px_10px_rgba(255,255,255,0.05)]',
          className
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={`${t('Ask something')}...`}
          aria-label="Chat input"
          className="w-full resize-none border-none h-10 outline-none bg-transparent text-neutral-800 dark:text-neutral-100 text-lg placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />

        <div className="mt-2 flex gap-3 justify-between">
          <div className="flex items-center">
            <ModelSelector
              llm={llm}
              setLLM={setLLM}
              embedding={embedding}
              setEmbedding={setEmbedding}
              reranker={reranker}
              setReranker={setReranker}
            />
          </div>

          <div className="flex gap-2 md:gap-4 items-center">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={'ghost'}
                    onClick={clearHistory}
                    disabled={!threadId}
                    aria-label="Clear chat"
                    size={'icon'}
                  >
                    <Icons.trash />
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={4} side="top">
                  <p>{t('Clear chat')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="default"
              type="submit"
              disabled={isLoading || !input.trim() || isRateLimited}
            >
              {isLoading ? `${t('Asking')}...` : t('Ask')}
            </Button>
          </div>
        </div>
      </motion.form>
    </>
  );
}
