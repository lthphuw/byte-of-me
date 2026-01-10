'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAssistantStore } from '@/stores/assistant';
import { useMounted, useWindowScroll } from '@mantine/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';

import ChatInput from './chat-input';
import { ChatMessage } from './chat-message';
import { ChatTitle } from './chat-title';
import Loading from './loading';

export default function ChatContent() {
  const {
    threadId,
    fetchHistory,
    sendMessage,
    messages,
    isHistoryLoading,
    isLoading,
  } = useAssistantStore(
    useShallow((state) => ({
      threadId: state.threadId,
      fetchHistory: state.fetchHistory,
      sendMessage: state.sendMessage,
      messages: state.messages,
      isHistoryLoading: state.isHistoryLoading,
      isLoading: state.isLoading,
    }))
  );
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
      await fetchHistory();
    })();
  }, [mounted, threadId, fetchHistory]);

  const handleSend = useCallback(
    async (query: string) => {
      // Scroll window to top
      scrollTo({ x: 0, y: 0 });
      await sendMessage(query);
    },
    [sendMessage]
  );

  return (
    <div className="relative w-full mx-auto flex flex-col h-[80vh]">
      <AnimatePresence mode="wait">
        {isHistoryLoading ? (
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
              <ChatMessage
                key={i}
                content={msg.content}
                role={msg.role}
                isLast={i == messages.length - 1}
              />
            ))}
            {isLoading && <Loading />}
          </motion.div>
        )}
      </AnimatePresence>

      <ChatInput className="justify-end mt-auto" onSend={handleSend} />
    </div>
  );
}
