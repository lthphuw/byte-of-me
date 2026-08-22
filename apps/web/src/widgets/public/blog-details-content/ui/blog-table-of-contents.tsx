'use client';

import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';

import { cn } from '@/shared/lib/utils';
import { useArticleHeadings } from '@/widgets/public/blog-details-content/lib/use-article-navigation';

/**
 * The sticky rail beside the article, from `xl`.
 *
 * Only the rail: below `xl` the same headings are reached through
 * `BlogReaderNav`, which also carries the bibliography. This used to grow a
 * second `collapsible` variant for that width — a sticky bar over the running
 * text — and shedding it is most of why this file is now short.
 */
export function BlogTableOfContents({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const { headings, activeId } = useArticleHeadings(targetId);

  if (headings.length < 2) return null;

  const jumpTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: scrollIntoViewBehavior() });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav aria-label={label} className="text-sm">
      <p className="mb-2 font-semibold text-muted-foreground">{label}</p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault();
                jumpTo(heading.id);
              }}
              className={cn(
                '-ml-px block border-l-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground',
                heading.level === 3 ? 'pl-6' : 'pl-3',
                activeId === heading.id &&
                  'border-primary font-medium text-foreground'
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
