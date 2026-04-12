import { ImageIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';


interface ImagePlaceholderProps {
  className?: string;
  text?: string;
}

export function ImagePlaceholder({ className, text }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground/40',
        className
      )}
    >
      <ImageIcon className="h-10 w-10 stroke-[1.5]" />
      {text && (
        <p className="text-[10px] font-medium uppercase tracking-wider">
          {text}
        </p>
      )}
    </div>
  );
}
