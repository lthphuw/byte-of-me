'use client';

import { EmbeddingModel } from '@ai/enums/embedding';
import { LLMModel } from '@ai/enums/llm';
import { RerankerModel } from '@ai/enums/reranker';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { Message } from '@/types/message';
import { chatThreadId } from '@/config/local-storage';
import { generateId } from '@/hooks/utils';
import { toast } from '@/components/ui/use-toast';

const COOLDOWN_MS = 5000;
const CHAT_THREAD_ID_PREFIX = 'byte-of-me-chat-';
interface AssistantState {
  threadId: string | null;
  isRateLimited: boolean;

  isHistoryLoading: boolean;
  isLoading: boolean;
  isLoadingChunk: boolean;
  isTyping: boolean;

  llm: string;
  embedding: string;
  reranker: string;

  messages: Message[];

  // actions
  setLLM: (llm: string) => void;
  setEmbedding: (emb: string) => void;
  setReranker: (rr: string) => void;
  setIsTyping: (typing: boolean) => void;

  clearHistory: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  sendMessage: (question: string) => Promise<void>;
}

let lastSentRef = 0;

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      threadId: null,
      isRateLimited: false,

      isHistoryLoading: false,
      isLoading: false,
      isLoadingChunk: false,
      isTyping: false,

      llm: LLMModel.Gemini25Flash,
      embedding: EmbeddingModel.JinaEmbeddingV3,
      reranker: RerankerModel.CohereRerankV35,

      messages: [],

      setLLM: (llm) => set({ llm }),
      setEmbedding: (emb) => set({ embedding: emb }),
      setReranker: (rr) => set({ reranker: rr }),

      clearHistory: async () => {
        const { threadId } = get();
        if (!threadId) return;

        try {
          set({
            isHistoryLoading: true,
          });
          const res = await fetch(`/api/chat`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId: threadId }),
          });

          if (!res.ok) {
            const error = await res.text();
            throw new Error(error || 'Unknown error');
          }

          toast({
            title: 'All clean!',
            description: 'Your chat has been cleared.',
          });
        } catch (err: unknown) {
          toast({
            title: 'Oops! Something went wrong.',
            description: (err as Error)?.message ?? 'Unknown error',
          });
        } finally {
          set({
            threadId: generateId(CHAT_THREAD_ID_PREFIX),
            messages: [],
            isHistoryLoading: false,
          });
        }
      },

      fetchHistory: async () => {
        const { threadId, clearHistory } = get();
        if (!threadId) {
          set({
            threadId: generateId(CHAT_THREAD_ID_PREFIX),
          });
          return;
        }

        try {
          set({ isHistoryLoading: true });
          const res = await fetch(`/api/chat/history?threadId=${threadId}`);
          const data = await res.json();
          if (Array.isArray(data.history)) {
            set({ messages: data.history });
          }
        } catch (err: unknown) {
          await clearHistory();
          toast({
            title: 'Oops! Fetching chat history got wrong...',
            description: (err as Error)?.message ?? 'Unknown error',
          });
        } finally {
          set({ isHistoryLoading: false });
        }
      },

      sendMessage: async (question: string) => {
        const { threadId, llm, embedding, reranker, messages } = get();
        const now = Date.now();

        if (now - lastSentRef < COOLDOWN_MS) {
          const secondsLeft = Math.ceil(
            (COOLDOWN_MS - (now - lastSentRef)) / 1000
          );
          toast({
            title: 'Please wait',
            description: `You can send a message again in ${secondsLeft} second(s).`,
          });
          return;
        }
        if (!threadId) {
          set({ threadId: generateId(CHAT_THREAD_ID_PREFIX) });
        }
        if (!question.trim()) return;

        // Append user message
        set({ messages: [...messages, { role: 'user', content: question }] });
        set({ isRateLimited: false, isLoading: true });

        const payload = {
          question,
          stream: true,
          threadId: threadId,
          llm,
          embedding,
          reranker,
        };

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const resp = await res.json();
            if (res.status === 429) {
              set({ isRateLimited: true, isLoading: false });
              toast({
                title: 'Rate Limit Exceeded',
                description:
                  resp.error ||
                  'You are sending messages too fast. Please wait a moment.',
              });

              set({
                messages: [
                  ...get().messages,
                  {
                    role: 'assistant',
                    content:
                      'You have reached the rate limit. Please wait before sending another message.',
                  },
                ],
              });
              return;
            }
            throw new Error(resp.error || 'Failed to fetch streamed response');
          }

          if (!res.body) throw new Error('No response stream');

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let content = '';

          // Append empty assistant message
          set({
            messages: [...get().messages, { role: 'assistant', content: '' }],
            isLoadingChunk: true,
            isTyping: true,
          });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            content += chunk;

            // update last assistant message
            set((state) => {
              const updated = [...state.messages];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content,
              };
              return { messages: updated };
            });
          }

          lastSentRef = Date.now();
        } catch (err: unknown) {
          toast({
            title: 'Oops! Something went wrong.',
            description: (err as Error)?.message ?? 'Unknown error',
          });

          set({
            messages: [
              ...get().messages,
              { role: 'assistant', content: 'Error while streaming response.' },
            ],
          });
        } finally {
          set({ isLoading: false, isLoadingChunk: false });
        }
      },
      setIsTyping: (typing: boolean) => {
        set({ isTyping: typing });
      },
    }),
    {
      name: chatThreadId,
      partialize: (state) => ({
        threadId: state.threadId ?? generateId(CHAT_THREAD_ID_PREFIX),
        llm: state.llm,
        embedding: state.embedding,
        reranker: state.reranker,
      }),
    }
  )
);
