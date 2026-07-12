'use client';

import { useEffect, useState } from 'react';

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
 */
export function BlogTableOfContents({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');

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
      node.style.scrollMarginTop = '6rem';
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

  return (
    <nav aria-label={label} className="text-sm">
      <p className="mb-3 font-semibold text-muted-foreground">{label}</p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(heading.id)
                  ?.scrollIntoView({ behavior: 'smooth' });
                history.replaceState(null, '', `#${heading.id}`);
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
