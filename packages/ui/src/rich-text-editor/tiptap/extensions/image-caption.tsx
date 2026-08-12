'use client';

import { cn } from '../../../lib/utils';

/**
 * The caption under a single image or under a row of them.
 *
 * Always a real `<figcaption>`: read-only it prints the text, editable it
 * holds an `<input>`. Tiptap's `NodeView.stopEvent` already returns true for
 * events whose target is an `INPUT` inside a node view and outside its
 * `contentDOM`, so the field takes Backspace and the arrow keys itself instead
 * of ProseMirror reading them as commands on the node — no event plumbing
 * needed here, but the caption must stay OUTSIDE `NodeViewContent` for that to
 * hold.
 *
 * `contentEditable={false}` marks the island for the browser's own editing
 * machinery, which would otherwise treat the caption of a non-leaf node (the
 * row) as document text.
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
