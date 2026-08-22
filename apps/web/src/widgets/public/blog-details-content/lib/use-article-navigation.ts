'use client';

import { useEffect, useState } from 'react';

/** An `h2`/`h3` in the article, and the id a link can jump to. */
export interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** One bibliography entry, as the rendered article already carries it. */
export interface ArticleReference {
  /** The `ref-…` element id — the jump target. */
  id: string;
  /** Its number, which is its position in the rendered list. */
  order: number;
  text: string;
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
 * Reads the article's headings out of the DOM and tracks which one is on
 * screen.
 *
 * The article body is `dangerouslySetInnerHTML` with no heading ids, so this
 * assigns slug ids on mount — every consumer that links to a heading depends
 * on that having happened, which is why it lives in one place rather than in
 * each of them.
 */
export function useArticleHeadings(targetId: string): {
  headings: ArticleHeading[];
  activeId: string;
} {
  const [headings, setHeadings] = useState<ArticleHeading[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const container = document.getElementById(targetId);
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll('h2, h3')
    ) as HTMLElement[];

    const seen = new Set<string>();
    const items = nodes.map((node): ArticleHeading => {
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
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [targetId]);

  return { headings, activeId };
}

/**
 * Reads the bibliography the `referenceList` node rendered at the end of the
 * article.
 *
 * Off the DOM rather than off the blog record, because that is where the
 * numbering already exists: entries are numbered by first citation, and
 * `applyCitationNumbering` resolved that at render time. Re-deriving it from
 * the stored document would be a second implementation of the same rule, free
 * to disagree with the one the reader can see.
 */
export function useArticleReferences(targetId: string): ArticleReference[] {
  const [references, setReferences] = useState<ArticleReference[]>([]);

  useEffect(() => {
    const container = document.getElementById(targetId);
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll('.references-item')
    ) as HTMLElement[];

    setReferences(
      items.map((item, index) => ({
        id: item.id,
        order: index + 1,
        // The entry's own text, without the backlink arrow's empty anchor.
        text: (
          item.querySelector('.references-text')?.textContent ??
          item.textContent ??
          ''
        ).trim(),
      }))
    );
  }, [targetId]);

  return references;
}
