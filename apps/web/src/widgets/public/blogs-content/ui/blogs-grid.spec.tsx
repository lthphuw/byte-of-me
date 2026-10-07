/**
 * What this defends is the list's entrance: the first row plays it for the
 * first result set only, and nothing is ever hidden in the server HTML — the
 * first row holds the LCP element, and Chrome ignores an `opacity: 0` candidate
 * until JS reveals it. A result set that arrives later (filter, page) must not
 * start hidden, or the entrance replays on every change.
 */
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogues live outside `src/`, so only a relative path reaches them.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { BlogsGrid } from './blogs-grid';

import type { PublicBlog } from '@/entities/blog/model/types';

function blog(id: string): PublicBlog {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    content: '',
    isPublished: true,
    publishedDate: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    tags: [],
  };
}

function grid(ids: string[], playEntrance: boolean) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <BlogsGrid
        blogs={ids.map(blog)}
        playEntrance={playEntrance}
        isStale={false}
        onTagClick={() => {}}
      />
    </NextIntlClientProvider>
  );
}

// Every card is an <article>; the motion wrapper is its parent.
const cellsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('article')].map(
    (article) => article.parentElement as HTMLElement
  );
const opacityOf = (el: Element) => (el as HTMLElement).style.opacity;

describe('BlogsGrid', () => {
  it('is never hidden in the server HTML', () => {
    const html = renderToString(grid(['a', 'b', 'c', 'd'], true));

    expect(html).toContain('a');
    expect(html).not.toContain('opacity:0');
  });

  it('animates only the first row on a client mount', () => {
    const { container } = render(grid(['a', 'b', 'c', 'd'], true));

    expect(cellsOf(container).map(opacityOf)).toEqual(['0', '0', '', '']);
  });

  it('mounts a later result set visible, even in the first row', () => {
    const { container, rerender } = render(grid(['a', 'b', 'c'], true));

    rerender(grid(['x', 'y', 'a', 'b', 'c'], false));

    const [x, y] = cellsOf(container);
    expect([opacityOf(x), opacityOf(y)]).toEqual(['', '']);
  });
});
