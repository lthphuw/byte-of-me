'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function TableOfContents() {
  const [headings, setHeadings] = useState<
    { id: string; text: string; level: number }[]
  >([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll('.blog-content h2, .blog-content h3')
    ).map((elem) => {
      const id = elem.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
      elem.id = id; // Gán ID để scroll
      return {
        id,
        text: elem.textContent || '',
        level: Number(elem.tagName.replace('H', '')),
      };
    });
    setHeadings(elements);

    // Xử lý active link khi scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    elements.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-2">
      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Mục lục
      </p>
      <ul className="space-y-2 text-sm">
        {headings.map((h) => (
          <li
            key={h.id}
            style={{ paddingLeft: `${h.level - 2}rem` }}
            className={cn(
              'border-l-2 pl-3 transition-colors',
              activeId === h.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
