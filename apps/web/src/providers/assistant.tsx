'use client';

import { toast } from '@/components/ui/use-toast';
import { chatThreadId } from '@/config/local-storage';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useMounted } from '@/hooks/use-mounted';
import { generateId } from '@/hooks/utils';
import { Message } from '@/types/message';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';

interface AssistantContextValue {
  threadId: string | null;
  isRateLimited: boolean;
  fetchHistory: () => Promise<Message[]>;
  clearHistory: () => Promise<void>;
  sendMessage: (
    question: string,
    append: (msg: Message) => void,
    updateLast: (partial: Partial<Message>) => void,
    options?: { stream?: boolean }
  ) => Promise<void>;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

interface AssistantProviderProps {
  children: ReactNode;
}

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  children,
}) => {

  const [threadId, setThreadId] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [value, setStorageValue, removeStorageValue] = useLocalStorage({
    key: chatThreadId,
  });
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

  const fetchHistory = useCallback(async (): Promise<Message[]> => {
    if (!threadId) return [];

    try {
      const res = await fetch(`/api/chat/history?thread_id=${threadId}`);
      const data = await res.json();
      return Array.isArray(data.history) ? data.history : [];
    } catch (err) {
      console.error('Error loading server history:', err);
      return [];
    }
  }, [threadId]);

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

  const sendMessage = useCallback(
    async (
      question: string,
      append: (msg: Message) => void,
      updateLast: (partial: Partial<Message>) => void,
      options: { stream?: boolean } = { stream: true }
    ) => {
      if (!threadId || !question.trim()) return;

      append({ role: 'user', content: question });
      setIsRateLimited(false); // reset trước khi gửi

      const payload = {
        question,
        stream: options.stream,
        thread_id: threadId,
      };

      if (options.stream) {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) {
              console.log("Set rate limit to true: ", true);
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
            throw new Error(text || 'Failed to fetch streamed response');
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
        } catch (err: any) {
          console.error('Stream error:', err);
          toast({
            title: 'Oops! Something went wrong.',
            description:
              typeof err === 'string' ? err : err.message ?? 'Unknown error',
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
        } catch (err) {
          console.error('Non-stream error:', err);
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
    [threadId]
  );

  return (
    <AssistantContext.Provider value={{ threadId, isRateLimited, fetchHistory, clearHistory, sendMessage }} >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error(
      'useAssistant must be used within an AssistantProvider'
    );
  }
  return context;
};
