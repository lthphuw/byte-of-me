'use client';

import { useAutoGrow } from '@byte-of-me/ui-hooks';
import { cn } from '@byte-of-me/ui-utils';

import { Textarea } from './textarea';

export function AutoGrowingTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
}) {
  const ref = useAutoGrow(value);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      // Scrolls once the text passes `max-h`; `overflow-hidden` here left it
      // unreachable by wheel or scrollbar.
      className={cn(
        'min-h-10 max-h-[200px] resize-none overflow-y-auto rounded-lg bg-background px-3 py-2',
        className
      )}
      style={{ height: 'auto' }}
    />
  );
}
