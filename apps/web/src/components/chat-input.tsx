'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistant } from '@/contexts/assistant';
import { FloatingPortal } from '@floating-ui/react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { verifyCaptcha } from '@/lib/core/verify-capcha';
import { cn } from '@/lib/utils';
import { useTurnstile } from '@/hooks/use-turnstile';
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
  clearChat: () => void;
  onSend: (message: string) => void;
  loading?: boolean;
  className?: string;
};

export default function ChatInput({
  clearChat,
  onSend,
  loading,
  className,
}: ChatInputProps) {
  const t = useTranslations('chat');
  const { threadId, isRateLimited, llm, setLLM, embedding, setEmbedding, reranker, setReranker } =
    useAssistant();

  const [input, setInput] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { captchaRef } = useTurnstile({
    onVerify: (token) => {
      setCaptchaToken(token);
      setShowCaptchaModal(false);
    },
  });

  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;

    if (message.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: 'Message too long',
        description: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    if (!captchaToken) {
      setShowCaptchaModal(true);
      return;
    }

    const result = await verifyCaptcha(message, captchaToken);
    if (result.success) {
      onSend(message);
      setInput('');
      window.turnstile?.reset();
    } else {
      toast({ title: result.error || 'CAPTCHA verification failed' });
      window.turnstile?.reset();
      setTimeout(() => location.reload(), 1000);
    }
  }, [input, captchaToken, loading]);

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
                    variant="icon"
                    onClick={clearChat}
                    disabled={!threadId}
                    aria-label="Clear chat"
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
              disabled={loading || !input.trim() || isRateLimited}
            >
              {loading ? `${t('Asking')}...` : t('Ask')}
            </Button>
          </div>
        </div>
      </motion.form>

      {/* Turnstile Cloudflare Widget */}
      <FloatingPortal>
        <motion.div
          initial={{ opacity: 0, zIndex: -50 }}
          animate={{
            opacity: showCaptchaModal ? 1 : 0,
            zIndex: showCaptchaModal ? 50 : -50,
          }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed inset-0 flex items-center justify-center bg-black/50',
            !showCaptchaModal && 'hidden'
          )}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{
              scale: showCaptchaModal ? 1 : 0.7,
              opacity: showCaptchaModal ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-lg w-full max-w-sm"
          >
            <h2 className="text-lg font-semibold text-center mb-4 text-neutral-800 dark:text-neutral-100">
              {'Please complete CAPTCHA'}
            </h2>
            <div ref={captchaRef} />
            <div className="mt-4 text-center">
              <button
                className="text-sm text-neutral-500 hover:underline"
                onClick={() => setShowCaptchaModal(false)}
              >
                {'Cancel'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </FloatingPortal>
    </>
  );
}
