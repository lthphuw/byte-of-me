'use client';

import { useMemo } from 'react';
import { useAssistantStore } from '@/stores/assistant';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';
import { useShallow } from 'zustand/react/shallow';

import { useStreamTyping } from '@/hooks/use-stream-typing';





export interface MessageContentProps {
  role: 'user' | 'assistant';
  content: string;
  isLast: boolean;
}

export function MessageContent({ role, content, isLast }: MessageContentProps) {
  const { isTyping, setIsTyping } = useAssistantStore(
    useShallow((state) => ({
      isTyping: state.isTyping,
      setIsTyping: state.setIsTyping,
    }))
  );

  const shouldTyping = useMemo(
    () => isTyping && isLast && role === 'assistant',
    [isTyping, isLast, role]
  );

  const displayedContent = useStreamTyping(content, {
    enabled: shouldTyping,
    speed: 20,
    setIsTyping: setIsTyping,
  });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw as Pluggable, rehypeSlug]}
      components={{
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-tight mb-2">{children}</li>
        ),
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  );
}
