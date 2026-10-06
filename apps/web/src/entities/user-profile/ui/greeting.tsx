import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/utils';

export interface GreetingProps {
  text?: string;
  className?: string;
  style?: CSSProperties;
}

export function Greeting({
  text = "Hi, I'm Phu",
  className,
  style,
}: GreetingProps) {
  return (
    <h1
      className={cn(
        'scroll-m-20 flex items-center',
        'text-left font-bold tracking-tight text-balance',
        'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
        'leading-tight sm:leading-tight md:leading-snug lg:leading-snug',
        // The one brand moment on the page. A fade to `primary/60` washed the tail out
        // on dark, so the stops come from the brand scale (>=3:1 large-text each).
        'bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent',
        'dark:from-brand-300 dark:to-brand-500',
        className
      )}
      style={style}
    >
      <span>{text}</span>
    </h1>
  );
}
