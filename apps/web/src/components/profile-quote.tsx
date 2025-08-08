import { Quote } from 'lucide-react';

export interface ProfileQuoteProps {
  quote: string;
}

export function ProfileQuote({ quote }: ProfileQuoteProps) {
  return (
    <blockquote className="flex w-full items-start gap-2 text-sm text-muted-foreground">
      <Quote className="mt-1 size-4 shrink-0 text-muted-foreground" />
      {/*<span className="">{quote}</span>*/}
      <blockquote className="md:pl-2 italic">{quote}</blockquote>
    </blockquote>
  );
}
