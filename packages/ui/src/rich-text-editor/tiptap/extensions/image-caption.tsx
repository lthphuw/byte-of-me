'use client';

import { cn } from '@byte-of-me/ui-utils';

/**
 * The caption under an image or a row: a real `<figcaption>`, holding an `<input>` when
 * editable. It must stay OUTSIDE `NodeViewContent` so Tiptap's `stopEvent` lets the field
 * take Backspace and arrows; `contentEditable={false}` stops the row's caption reading as text.
 */
export function ImageCaption({
  caption,
  editable,
  placeholder,
  onChange,
  className,
}: {
  caption: string;
  editable: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  if (!editable) {
    if (!caption.trim()) return null;

    return (
      <figcaption
        className={cn(
          'mt-2 text-center text-sm text-muted-foreground',
          className
        )}
      >
        {caption}
      </figcaption>
    );
  }

  return (
    <figcaption contentEditable={false} className={cn('mt-2', className)}>
      <input
        type="text"
        value={caption}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
      />
    </figcaption>
  );
}
