'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';





type ExpandableTextProps = {
  content: string;
  defaultLines?: number;
};

export function ExpandableText({
  content,
  defaultLines = 3,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const t = useTranslations('components.expandableText');
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Clone element to measure full height
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.visibility = 'hidden';
    clone.style.position = 'absolute';
    clone.style.display = 'block';
    clone.style.webkitLineClamp = 'unset';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';

    el.parentElement?.appendChild(clone);

    const fullHeight = clone.clientHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * defaultLines;

    setIsOverflowing(fullHeight > maxHeight);

    clone.remove();
  }, [content, defaultLines]);

  return (
    <div>
      <article
        ref={textRef}
        className="text-muted-foreground overflow-hidden break-words text-sm leading-relaxed"
        style={
          expanded
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: defaultLines,
                WebkitBoxOrient: 'vertical',
              }
        }
      >
        {content}
      </article>

      {isOverflowing && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-primary mt-1 text-xs hover:underline"
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </div>
  );
}
