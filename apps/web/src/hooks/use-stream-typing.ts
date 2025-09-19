import { useEffect, useRef, useState } from 'react';

export type StreamTypingOptions = {
  enabled: boolean;
  speed?: number;
  setIsTyping?: (typing: boolean) => void;
};

export function useStreamTyping(fullText: string, opts: StreamTypingOptions) {
  const { enabled, speed = 20, setIsTyping = (typing: boolean) => {} } = opts;
  const [displayed, setDisplayed] = useState(enabled ? '' : fullText);
  const queueRef = useRef<string[]>([]);
  const lastTextRef = useRef('');
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(fullText);
      return;
    }

    const prev = lastTextRef.current;
    const diff = fullText.slice(prev.length);

    if (diff) {
      queueRef.current.push(diff);
      lastTextRef.current = fullText;
    }
  }, [fullText, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (typingRef.current) return;

    if (setIsTyping) {
      setIsTyping(true);
    }

    typingRef.current = setInterval(() => {
      if (queueRef.current.length === 0) {
        clearInterval(typingRef.current!);
        typingRef.current = null;
        if (setIsTyping) {
          setIsTyping(false);
        }
        return;
      }

      const next = queueRef.current[0];
      const char = next[0];
      queueRef.current[0] = next.slice(1);

      setDisplayed((d) => d + char);

      if (queueRef.current[0].length === 0) {
        queueRef.current.shift();
      }
    }, speed);

    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    };
  }, [enabled, speed, setIsTyping]);

  return displayed;
}
