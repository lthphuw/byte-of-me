/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Message } from '@/types/message';
import { chatThreadId } from '@/config/local-storage';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useMounted } from '@/hooks/use-mounted';
import { generateId } from '@/hooks/utils';
import { toast } from '@/components/ui/use-toast';

interface AssistantContextValue {
  threadId: string | null;
  isRateLimited: boolean;
  fetchHistory: () => Promise<Message[]>;
  clearHistory: () => Promise<void>;
  sendMessage: (
    question: string,
    append: (msg: Message) => void,
    updateLast: (partial: Partial<Message>) => void,
    options?: { stream?: boolean; llm?: string; embedding?: string }
  ) => Promise<void>;
  llm: string;
  setLLM: (llm: string) => void;
  embedding: string;
  setEmbedding: (embedd: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

interface AssistantProviderProps {
  children: ReactNode;
}

const COOLDOWN_MS = 5000;

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  children,
}) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [value, setStorageValue, removeStorageValue] = useLocalStorage({
    key: chatThreadId,
  });

  const [llm, setLLM] = useState<string>('gemini-2.0-flash');
  const [embedding, setEmbedding] = useState<string>('text-embedding-004');
  const lastSentRef = useRef<number>(0);

  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;

    let stored = value;
    if (!stored) {
      stored = generateId('byte-of-me-chat-');
      setStorageValue(stored);
    }
    setThreadId(stored);
  }, [mounted]);

  const clearHistory = useCallback(async () => {
    if (!threadId) return;

    try {
      const res = await fetch(`/api/chat`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Unknown error');
      }

      toast({
        title: 'All clean!',
        description: 'Your chat has been cleared.',
      });
    } catch (err: any) {
      toast({
        title: 'Oops! Something went wrong.',
        description:
          typeof err === 'string' ? err : err.message ?? 'Unknown error',
      });
    } finally {
      setStorageValue('');
      removeStorageValue();
    }
  }, [threadId]);

  const fetchHistory = useCallback(async (): Promise<Message[]> => {
    if (!threadId) return [];

    try {
      const res = await fetch(`/api/chat/history?thread_id=${threadId}`);
      const data = await res.json();
      return Array.isArray(data.history) ? data.history : [];
    } catch (err: any) {
      await clearHistory();
      toast({
        title: 'Oops! Fetching chat history got wrong...',
        description:
          typeof err === 'string' ? err : err.message ?? 'Unknown error',
      });

      return [];
    }
  }, [threadId, clearHistory]);

  const sendMessage = useCallback(
    async (
      question: string,
      append: (msg: Message) => void,
      updateLast: (partial: Partial<Message>) => void,
      options: { stream?: boolean; llm?: string; embedding?: string } = {
        stream: true,
      }
    ) => {
      const now = Date.now();
      if (now - lastSentRef.current < COOLDOWN_MS) {
        const secondsLeft = Math.ceil(
          (COOLDOWN_MS - (now - lastSentRef.current)) / 1000
        );

        toast({
          title: 'Please wait',
          description: `You can send a message again in ${secondsLeft} second(s).`,
        });
        return;
      }

      if (!threadId || !question.trim()) return;

      append({ role: 'user', content: question });
      setIsRateLimited(false);

      const payload = {
        question,
        stream: options.stream,
        thread_id: threadId,
        llm: options.llm ?? llm,
        embedding: options.embedding ?? embedding,
      };

      if (options.stream) {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const resp = await res.json();
            if (res.status === 429) {
              setIsRateLimited(true);

              toast({
                title: 'Rate Limit Exceeded',
                description:
                  resp.error ||
                  'You are sending messages too fast. Please wait a moment.',
              });

              append({
                role: 'assistant',
                content:
                  'You have reached the rate limit. Please wait before sending another message.',
              });
              return;
            }
            throw new Error(resp.error || 'Failed to fetch streamed response');
          }

          if (!res.body) throw new Error('No response stream');

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let content = '';

          append({ role: 'assistant', content: '' });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            content += chunk;

            updateLast({ content });
          }

          lastSentRef.current = Date.now();
        } catch (err: any) {
          toast({
            title: 'Oops! Something went wrong.',
            description:
              typeof err === 'string'
                ? err
                : (err.message || err.error) ?? 'Unknown error',
          });
          append({
            role: 'assistant',
            content: 'Error while streaming response.',
          });
        }
      } else {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) {
              setIsRateLimited(true);
              toast({
                title: 'Rate Limit Exceeded',
                description:
                  text ||
                  'You are sending messages too fast. Please wait a moment.',
              });
              append({
                role: 'assistant',
                content:
                  'You have reached the rate limit. Please wait before sending another message.',
              });
              return;
            }
            throw new Error(text || 'Failed to fetch non-streamed response');
          }

          const data = await res.json();
          append({
            role: 'assistant',
            content: data.answer || 'No answer',
          });

          lastSentRef.current = Date.now();
        } catch (err) {
          toast({
            title: 'Oops! Something went wrong.',
            description:
              typeof err === 'string'
                ? err
                : (err as any)?.message ?? 'Unknown error',
          });
          append({
            role: 'assistant',
            content: 'Error while fetching response.',
          });
        }
      }
    },
    [threadId, embedding, llm]
  );

  return (
    <AssistantContext.Provider
      value={{
        threadId,
        isRateLimited,
        fetchHistory,
        clearHistory,
        sendMessage,
        llm,
        setLLM,
        embedding,
        setEmbedding,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
