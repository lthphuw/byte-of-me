import type { CSSProperties } from 'react';
import { Quote } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

export interface ProfileQuoteProps {
  quote: string;
  author?: string | null;
  className?: string;
  style?: CSSProperties;
}

export function ProfileQuote({
  quote,
  author,
  className,
  style,
}: ProfileQuoteProps) {
  return (
    <blockquote
      className={cn(
        'relative p-6 bg-muted/50 rounded-xl shadow-sm',
        'text-base md:text-md italic text-foreground leading-relaxed',
        'flex flex-col gap-4 items-center',
        className
      )}
      style={style}
    >
      <Quote className="size-4 rotate-180 text-primary opacity-50 md:size-6" />

      <p className="">{quote}</p>

      {author && (
        <cite className="mt-4 block text-right text-sm not-italic text-muted-foreground">
          — {author}
        </cite>
      )}
    </blockquote>
  );
}
