'use client';

import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

/**
 * The ToC tab: the active note's headings, indented by level, click-to-scroll.
 * The heading ids are DOM ids the TableOfContents extension stamped, so plain
 * `getElementById` reaches them inside the editor's scroll container.
 */
export function NoteOutline({ items }: { items: OutlineItem[] }) {
  const t = useTranslations('dashboard.note.sidebar');

  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        {t('tocEmpty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 border-l border-muted-foreground/20 px-3 py-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            document
              .getElementById(item.id)
              ?.scrollIntoView({
                behavior: scrollIntoViewBehavior(),
                block: 'start',
              });
          }}
          className={cn(
            '-ml-px border-l-2 border-transparent px-3 py-1 text-left text-xs transition-colors hover:border-primary hover:text-primary',
            item.isActive && 'border-primary text-primary',
            item.level === 1 && 'text-sm font-semibold',
            item.level === 2 && 'ml-2 font-medium',
            item.level >= 3 && 'ml-4 text-muted-foreground'
          )}
        >
          <span className="line-clamp-2">{item.text}</span>
        </button>
      ))}
    </div>
  );
}
