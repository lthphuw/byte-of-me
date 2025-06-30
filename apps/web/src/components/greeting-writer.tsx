import { SplitText } from './split-text';

export interface GreetingWriterProps {
  text?: string;
}

export function GreetingWriter({ text = "Hi, I'm Phu." }: GreetingWriterProps) {
  return (
    <h1 className="font-mono text-justify leading-relaxed break-words text-4xl font-bold sm:text-5xl md:text-6xl overflow-visible">
      <SplitText
        className="overflow-visible"
        text={text}
        splitType="chars"
        ease="elastic.out(1, 0.3)"
        delay={150}
        duration={2}
        threshold={0.5}
      />
    </h1>
  );
}
