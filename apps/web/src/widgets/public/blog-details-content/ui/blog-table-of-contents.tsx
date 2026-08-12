'use client';

import { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@byte-of-me/ui';
import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import { ChevronDown, List } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'section'
  );
}

/**
 * Builds a table of contents from the h2/h3 headings rendered inside
 * `#{targetId}`. The article body is `dangerouslySetInnerHTML` with no heading
 * ids, so we assign slug ids on mount, then track the active heading with an
 * IntersectionObserver for scroll-spy.
 *
 * `variant` picks the presentation: a sticky rail beside the article on wide
 * screens, or a collapsed bar above it on narrow ones, where an expanded list
 * would push the first paragraph off the screen.
 */
export function BlogTableOfContents({
  targetId,
  label,
  variant = 'rail',
}: {
  targetId: string;
  label: string;
  variant?: 'rail' | 'collapsible';
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const container = document.getElementById(targetId);
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll('h2, h3')
    ) as HTMLElement[];

    const seen = new Set<string>();
    const items = nodes.map((node): Heading => {
      let id = node.id;
      if (!id) {
        const base = slugify(node.textContent || '');
        let unique = base;
        let i = 1;
        while (seen.has(unique)) unique = `${base}-${i++}`;
        id = unique;
        node.id = id;
      }
      seen.add(id);
      // Landing offset is a responsive class on the article (see RichText) —
      // an inline style here could not vary with the breakpoint.
      return {
        id,
        text: node.textContent || '',
        level: node.tagName === 'H3' ? 3 : 2,
      };
    });
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [targetId]);

  if (headings.length < 2) return null;

  const jumpTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: scrollIntoViewBehavior() });
    history.replaceState(null, '', `#${id}`);
  };

  const list = (
    <ul className="space-y-1 border-l border-border">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              jumpTo(heading.id);
              setOpen(false);
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
  );

  if (variant === 'collapsible') {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <nav aria-label={label} className="relative text-sm">
          {/* Opaque, because this bar is sticky and scrolls over body text. */}
          <div className="overflow-hidden rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50">
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <List className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <span className="text-xs tabular-nums">{headings.length}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </span>
            </CollapsibleTrigger>
          </div>
          {/* Overlay, not in flow: expanding in flow changes the document
              height at the bar's home position above the viewport, which
              visibly shifts the page on Safari/iOS (no scroll anchoring) and
              moves the target mid-flight when a click closes the list during
              the smooth scroll. Capped so long posts stay within the
              viewport. */}
          <CollapsibleContent className="absolute inset-x-0 top-full mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
            {list}
          </CollapsibleContent>
        </nav>
      </Collapsible>
    );
  }

  return (
    <nav aria-label={label} className="text-sm">
      <p className="mb-3 font-semibold text-muted-foreground">{label}</p>
      {list}
    </nav>
  );
}
