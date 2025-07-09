'use client';

import { useEffect, useRef, useState } from 'react';
import { useAssistant } from '@/providers/assistant';
import { FloatingPortal } from '@floating-ui/react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { turnstileSitekey } from '@/config/turnstile-client';
import { cn } from '@/lib/utils';

import { Icons } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { toast } from './ui/use-toast';

type ChatInputProps = {
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
  const { threadId, isRateLimited } = useAssistant();
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [input, setInput] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isTurnstileReady, setIsTurnstileReady] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const dangerousKeywords = ['ignore', 'system prompt', 'bypass', 'secret'];
    if (
      dangerousKeywords.some((keyword) => input.toLowerCase().includes(keyword))
    ) {
      toast({ title: 'Invalid input detected' });
      return;
    }

    if (!captchaToken) {
      setShowCaptchaModal(true);
      return;
    }

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          token: captchaToken,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onSend(input.trim());
        setInput('');
        window.turnstile?.reset();
      } else {
        toast({ title: result.error || 'CAPTCHA verification failed' });
        window.turnstile?.reset();
      }
    } catch (error) {
      toast({ title: 'Failed to send message: ' + error });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Load Turnstile script
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      document.querySelector('script[src*="turnstile"]')
    )
      return;

    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    script.onerror = () => console.error('Failed to load Turnstile script');
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Handle global callback
  useEffect(() => {
    window.onTurnstileLoad = () => {
      console.log('Turnstile script loaded successfully');
      setIsTurnstileReady(true);
    };
  }, []);

  // Render Turnstile when modal is shown
  useEffect(() => {
    console.log('Turnstile debug:', {
      showCaptchaModal,
      isTurnstileReady,
      captchaRef: captchaRef.current,
      sitekey: turnstileSitekey,
      windowTurnstile: window.turnstile,
    });

    if (!isTurnstileReady || !captchaRef.current) return;

    try {
      captchaRef.current.innerHTML = '';
      window.turnstile?.render(captchaRef.current, {
        sitekey: turnstileSitekey,
        callback: (token: string) => {
          setTimeout(() => {
            setCaptchaToken(token);
            setShowCaptchaModal(false);
          }, 2000);
        },
        'error-callback': (errorCode: string) => {
          toast({ title: 'Failed to load CAPTCHA' });
        },
        theme: 'auto',
      });
    } catch (error) {
      toast({ title: 'Failed to initialize CAPTCHA' });
    }
  }, [isTurnstileReady]);

  useEffect(() => {
    if (!captchaToken || !showCaptchaModal) return;

    handleSend();
  }, [captchaToken]);

  return (
    <>
      <motion.div
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
          onChange={(e) => {
            const value = e.target.value;
            const charLimit = 150;
            const wordLimit = 25;

            const trimmedValue = value.slice(0, charLimit);
            const words = trimmedValue.trim().split(/\s+/);

            if (words.length <= wordLimit) {
              setInput(trimmedValue);
            } else {
              const trimmedWords = words.slice(0, wordLimit).join(' ');
              setInput(trimmedWords.slice(0, charLimit));
            }
          }}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={`${t('Ask something')}...`}
          className="w-full resize-none border-none h-10 outline-none bg-transparent text-neutral-800 dark:text-neutral-100 text-lg placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />

        <div className="mt-2 flex gap-3 justify-end">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  onClick={clearChat}
                  disabled={!threadId}
                  className="transition-all duration-300 ease-out hover:scale-105 active:scale-95"
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
            onClick={handleSend}
            disabled={loading || !input.trim() || isRateLimited}
            className="px-4 py-1.5 text-sm rounded-md bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
          >
            {loading ? `${t('Asking')}...` : t('Ask')}
          </Button>
        </div>
      </motion.div>

      {/* Turnstile Widget Modal - Always present in DOM */}
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
              Please complete CAPTCHA
            </h2>
            <div ref={captchaRef} />
            <div className="mt-4 text-center">
              <button
                className="text-sm text-neutral-500 hover:underline"
                onClick={() => setShowCaptchaModal(false)}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      </FloatingPortal>
    </>
  );
}
