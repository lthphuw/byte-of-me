'use client';

import { cn } from '@/lib/utils';

export type GreetingWriterProps = BaseComponentProps & {
  text?: string;
};

export function GreetingWriter({
                                 text = "Hi, I'm Phu",
                                 className,
                                 style,
                               }: GreetingWriterProps) {
  return (
    <h1
      className={cn(
        'scroll-m-20 flex items-center',
        'text-left font-bold tracking-tight text-balance',
        'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
        'leading-tight sm:leading-tight md:leading-snug lg:leading-snug',
        'bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent',
        className
      )}
      style={style}
    >
      <span>{text}</span>
    </h1>
  );
}
