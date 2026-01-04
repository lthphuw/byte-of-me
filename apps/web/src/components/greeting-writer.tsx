import { cn } from '@/lib/utils';

export type GreetingWriterProps = BaseComponentProps & {
  text?: string;
};

export function GreetingWriter({ text = "Hi, I'm Phu.", className, style }: GreetingWriterProps) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-left text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance',
        'bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent', // Added gradient for visual interest
        className
      )}
      style={style}
    >
      {text}
    </h1>
  );
}
