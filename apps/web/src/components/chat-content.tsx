'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistant } from '@/contexts/assistant';
import { AnimatePresence, motion } from 'framer-motion';

import { useMounted } from '@/hooks/use-mounted';
import { useWindowScroll } from '@/hooks/use-window-scroll';

import ChatInput from './chat-input';
import { ChatMessage } from './chat-message';
import { ChatTitle } from './chat-title';
import Loading from './loading';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const { threadId, fetchHistory, clearHistory, sendMessage } = useAssistant();
  const mounted = useMounted();
  const [, scrollTo] = useWindowScroll();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat container to bottom when messages change
  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Fetch chat history
  useEffect(() => {
    if (!mounted || !threadId) return;

    (async () => {
      setGlobalLoading(true);
      const history = await fetchHistory();
      setMessages(history);
      setGlobalLoading(false);
    })();
  }, [mounted, threadId, fetchHistory]);

  const handleSend = useCallback(
    async (question: string) => {
      // Scroll window to top
      scrollTo({ x: 0, y: 0 });
      setLoading(true);

      await sendMessage(
        question,
        (msg) => setMessages((prev) => [...prev, msg]),
        (partial) =>
          setMessages((prev) =>
            prev.map((msg, i) =>
              i === prev.length - 1 ? { ...msg, ...partial } : msg
            )
          )
      );

      setLoading(false);
    },
    [sendMessage]
  );

  const handleClearChat = useCallback(async () => {
    setGlobalLoading(true);
    await clearHistory();
    setMessages([]);
    setGlobalLoading(false);
  }, [clearHistory]);

  return (
    <div className="relative w-full mx-auto flex flex-col h-[80vh]">
      <AnimatePresence mode="wait">
        {globalLoading ? (
          <Loading />
        ) : messages.length === 0 ? (
          <ChatTitle
            invoke={handleSend}
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
        ) : (
          <motion.div
            key="chat-messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            ref={containerRef}
            className="flex-1 space-y-4 px-4 py-6 overflow-y-auto"
          >
            {messages.map((msg, i) => (
              <ChatMessage key={i} content={msg.content} role={msg.role} />
            ))}
            {loading && <Loading />}
          </motion.div>
        )}
      </AnimatePresence>

      <ChatInput
        className="justify-end mt-auto"
        clearChat={handleClearChat}
        onSend={handleSend}
        loading={loading}
      />

      {/*<FeatureCallout*/}
      {/*  title={'New Features'}*/}
      {/*  description={*/}
      {/*    <p className="text-sm leading-relaxed flex flex-wrap gap-x-1">*/}
      {/*      You can now choose from multiple Gemini models and embeddings by*/}
      {/*      clicking the button in the{' '}*/}
      {/*      <span className={'italic font-semibold'}>bottom-left corner</span>{' '}*/}
      {/*      to explore.*/}
      {/*    </p>*/}
      {/*  }*/}
      {/*/>*/}
    </div>
  );
}
