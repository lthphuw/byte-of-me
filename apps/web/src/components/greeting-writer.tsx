export interface GreetingWriterProps {
  text?: string;
}

export function GreetingWriter({ text = "Hi, I'm Phu." }: GreetingWriterProps) {
  return (
    <h1 className="scroll-m-20 text-left text-4xl md:text-6xl font-extrabold tracking-tight text-balance">
      {text}
    </h1>
  );
}
