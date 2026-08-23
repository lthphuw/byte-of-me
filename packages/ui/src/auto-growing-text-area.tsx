'use client';

import { type FocusEventHandler, useEffect, useRef } from 'react';

import { cn } from './lib/utils';
import { Textarea } from './textarea';

export interface AutoGrowingTextAreaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
  /** Optional passthrough to the underlying `<textarea>`'s native blur event.
   *  Added for a caller that keeps its own draft state and persists on blur
   *  rather than per keystroke — `onChange` alone cannot express that. */
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
}

export function AutoGrowingTextarea({
  value,
  onChange,
  placeholder,
  className,
  onBlur,
}: AutoGrowingTextAreaProps) {
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
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(
        'w-full resize-none overflow-hidden bg-background p-3',
        'text-base md:text-sm',
        'min-h-[48px] md:min-h-[44px]',
        'max-h-[200px] rounded-xl',
        'focus-visible:ring-1 focus-visible:ring-neutral-400',
        'transition-[height] duration-200 ease-out',
        className
      )}
      style={{ height: 'auto' }}
    />
  );
}
