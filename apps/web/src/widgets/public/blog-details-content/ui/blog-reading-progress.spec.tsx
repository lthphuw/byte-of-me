import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { BlogReadingProgress } from './blog-reading-progress';

/** happy-dom has no layout, so the page's scroll geometry is set by hand. */
function setPage({
  scrollHeight,
  clientHeight,
  scrollTop = 0,
}: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop?: number;
}) {
  const root = document.scrollingElement as HTMLElement;
  Object.defineProperty(root, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(root, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
  root.scrollTop = scrollTop;
  window.dispatchEvent(new Event('scroll'));
}

afterEach(() => {
  cleanup();
  // Back to happy-dom's own geometry, so no other spec inherits this page.
  const root = document.scrollingElement as HTMLElement;
  Reflect.deleteProperty(root, 'scrollHeight');
  Reflect.deleteProperty(root, 'clientHeight');
  root.scrollTop = 0;
});

describe('BlogReadingProgress', () => {
  it('reports how far the reader has scrolled through the page', async () => {
    setPage({ scrollHeight: 2000, clientHeight: 1000 });
    render(<BlogReadingProgress />);
    const bar = screen.getByRole('progressbar');

    setPage({ scrollHeight: 2000, clientHeight: 1000, scrollTop: 500 });
    await waitFor(() => expect(bar.getAttribute('aria-valuenow')).toBe('50'));

    setPage({ scrollHeight: 2000, clientHeight: 1000, scrollTop: 1000 });
    await waitFor(() => expect(bar.getAttribute('aria-valuenow')).toBe('100'));
  });

  it('stays empty on a page too short to scroll', async () => {
    setPage({ scrollHeight: 800, clientHeight: 800 });
    render(<BlogReadingProgress />);
    const bar = screen.getByRole('progressbar');

    // Give the scroll tracker its frame; a zero-length scroll range makes it
    // report full progress, which must not reach the bar.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });
});
