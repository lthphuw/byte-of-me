import { BaseComponentProps } from '@/types';
import { Quote } from 'lucide-react';

import { cn } from '@/lib/utils';





export type ProfileQuoteProps = BaseComponentProps & {
  quote: string;
  author?: string | null;
}

export function ProfileQuote({ quote, author, className, style }: ProfileQuoteProps) {
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
      <Quote className="text-primary opacity-50 size-4 md:size-6 rotate-180" />

      <p className="">{quote}</p>

      {author && (
        <cite className="block mt-4 text-right text-sm text-muted-foreground not-italic">
          — {author}
        </cite>
      )}
    </blockquote>
  );
}
