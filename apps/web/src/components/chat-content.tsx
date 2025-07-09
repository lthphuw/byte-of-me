'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistant } from '@/providers/assistant';

import { useMounted } from '@/hooks/use-mounted';
import { useWindowScroll } from '@/hooks/use-window-scroll';

import ChatInput from './chat-input';
import { ChatMessage } from './chat-message';
import { ChatTitle } from './chat-title';
import Loading from './loading';
import { ScrollArea } from './ui/scroll-area';

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
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat container to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!mounted || !threadId) return;

    (async () => {
      setGlobalLoading(true);
      const history = await fetchHistory();
      setMessages(history);
      setGlobalLoading(false);
    })();
  }, [mounted, threadId, fetchHistory]);

  const handleSend = async (question: string) => {
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
  };

  const handleClearChat = useCallback(async () => {
    setGlobalLoading(true);
    await clearHistory();
    setMessages([]);
    setGlobalLoading(false);
  }, [clearHistory]);

  return (
    <div className="relative w-full mx-auto flex flex-col h-[80vh]">
      {globalLoading ? (
        <Loading />
      ) : messages.length === 0 ? (
        <ChatTitle
          invoke={handleSend}
          className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        />
      ) : (
        <ScrollArea
          type="always"
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
        >
          {messages.map((msg, i) => (
            <React.Fragment key={i}>
              <ChatMessage content={msg.content} role={msg.role} />
            </React.Fragment>
          ))}
          {loading && <Loading />}
        </ScrollArea>
      )}

      <ChatInput
        className="justify-end mt-auto"
        clearChat={handleClearChat}
        onSend={handleSend}
        loading={loading}
      />
    </div>
  );
}
