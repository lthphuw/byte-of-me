'use client';

import { useEffect, useRef } from 'react';

import { Textarea } from '@/shared/ui/textarea';

export function AutoGrowingTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="max-h-[200px] min-h-[44px] w-full resize-none overflow-hidden bg-background p-3 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
      style={{ height: 'auto' }}
    />
  );
}
