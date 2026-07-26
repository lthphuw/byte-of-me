'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

interface ExpandableRichTextProps {
  /**
   * Already-rendered rich text, passed down from a server component.
   *
   * Deliberately `children` rather than a `content` string this component
   * renders itself: importing `RichText` here would pull the Tiptap extension
   * schema (~1 MB of tiptap/prosemirror/lowlight) into the client bundle of
   * every page that shows an achievement. Rendering stays on the server; only
   * the collapse behaviour is a client concern.
   */
  children: ReactNode;
  /** Height the collapsed state clamps to, in px. */
  collapsedHeight?: number;
  className?: string;
}

/**
 * Collapsed view of rich text, sharing the copy of `ExpandableText`.
 *
 * Clamping happens by measured height rather than `-webkit-line-clamp`, which
 * only ever counts lines of a single text block and so leaves lists, images
 * and blockquotes uncut.
 */
export function ExpandableRichText({
  children,
  collapsedHeight = 104,
  className,
}: ExpandableRichTextProps) {
  const t = useTranslations('components.expandableText');
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Images and webfonts settle after the first paint, so the measurement is
    // repeated whenever the content box changes size.
    const measure = () =>
      setIsOverflowing(element.scrollHeight > collapsedHeight + 8);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children, collapsedHeight]);

  const isClamped = isOverflowing && !expanded;

  return (
    <div className={className}>
      <div
        className={cn('relative', isClamped && 'overflow-hidden')}
        style={isClamped ? { maxHeight: collapsedHeight } : undefined}
      >
        <div ref={contentRef}>{children}</div>

        {isClamped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {isOverflowing && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </div>
  );
}
