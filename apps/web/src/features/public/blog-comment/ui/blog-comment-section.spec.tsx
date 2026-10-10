/**
 * What this defends is the comment thread's own lifecycle, driven through the
 * real `getPaginatedPublicCommentsForBlog` action with only the Prisma
 * `comment` delegate replaced: the list is not requested until the reader
 * scrolls within reach of it, and a failed load says so with a way to retry
 * rather than passing for "No comments yet".
 *
 * The action reaches `env.ts`, which refuses to load when `window` exists, so
 * the section is imported with the DOM bindings dropped and put back after —
 * the same dance, and the same reasons, as
 * `src/entities/blog/api/get-paginated-public-blogs.spec.ts`.
 */
import type { ReactNode } from 'react';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { SessionProvider } from 'next-auth/react';
import { NextIntlClientProvider } from 'next-intl';

// The catalogues live outside `src/`, so only a relative path reaches them.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import type * as BlogCommentSectionModule from './blog-comment-section';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

let BlogCommentSection: typeof BlogCommentSectionModule.BlogCommentSection;

beforeAll(async () => {
  // Client-only dependencies load with the DOM still present: a module first
  // imported while the globals are gone stays cached in server mode for the whole
  // `bun test` process and breaks every later spec that renders it.
  await import('@byte-of-me/ui');
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'document');
  ({ BlogCommentSection } = await import('./blog-comment-section'));
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
});

afterAll(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
});

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'comment', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

function row(id: string, content: string) {
  return {
    id,
    content,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    blogId: BLOG_ID,
    parentId: null,
    userId: 'user-1',
    user: { name: 'Ada' },
  };
}

/** Hands the test the observers the section creates, so scrolling is manual. */
const observers: {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  element?: Element;
}[] = [];

class FakeIntersectionObserver {
  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}
  observe(element: Element) {
    observers.push({
      callback: this.callback,
      options: this.options,
      element,
    });
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const originalObserver = globalThis.IntersectionObserver;

function intersect(match: (options?: IntersectionObserverInit) => boolean) {
  const observer = observers.findLast((o) => match(o.options));
  if (!observer) throw new Error('nothing is observing that element');
  act(() => {
    observer.callback(
      [
        { isIntersecting: true, target: observer.element },
      ] as IntersectionObserverEntry[],
      {} as IntersectionObserver
    );
  });
}

/** The reader comes within 400px of the thread. */
const scrollNearThread = () =>
  intersect((options) => options?.rootMargin === '400px 0px');

/** The reader reaches the end of the loaded comments. */
const scrollToListEnd = () =>
  intersect((options) => options?.threshold === 0.1);

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={null}>
        <NextIntlClientProvider locale="en" messages={en}>
          {children}
        </NextIntlClientProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
  return render(<BlogCommentSection blogId={BLOG_ID} />, { wrapper });
}

beforeEach(() => {
  observers.length = 0;
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: FakeIntersectionObserver,
    configurable: true,
    writable: true,
  });
  count.mockReset().mockResolvedValue(1);
  findMany.mockReset().mockResolvedValue([row('c1', 'First!')]);
  spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  spyOn(logger, 'error').mockRestore();
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: originalObserver,
    configurable: true,
    writable: true,
  });
});

describe('BlogCommentSection', () => {
  it('requests no comments until the reader is near the thread', async () => {
    renderSection();

    await act(async () => {});
    expect(findMany).not.toHaveBeenCalled();

    scrollNearThread();

    expect(await screen.findByText('First!')).toBeTruthy();
    expect(findMany).toHaveBeenCalled();
  });

  it('says there are no comments when there genuinely are none', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    renderSection();

    scrollNearThread();

    expect(await screen.findByText('No comments yet')).toBeTruthy();
  });

  it('reports a failed load, with a retry, instead of "No comments yet"', async () => {
    findMany.mockRejectedValue(new Error('connection lost'));
    renderSection();

    scrollNearThread();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Failed to load comments');
    expect(screen.queryByText('No comments yet')).toBeNull();

    findMany.mockResolvedValue([row('c1', 'First!')]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('First!')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('stops asking for the next page once one has failed', async () => {
    const roots = ['c1', 'c2', 'c3', 'c4'].map((id) =>
      row(id, `Comment ${id}`)
    );
    count.mockResolvedValue(6);
    // Page 1's roots, then their replies; every later query fails, slowly
    // enough that each attempt is rendered as "fetching" before it settles.
    findMany
      .mockReset()
      .mockResolvedValueOnce(roots)
      .mockResolvedValueOnce([])
      .mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('connection lost')), 20)
          )
      );
    renderSection();
    scrollNearThread();
    await screen.findByText('Comment c1');

    scrollToListEnd();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Failed to load comments');
    expect(screen.getByText('Comment c1')).toBeTruthy();

    // The sentinel is still in view, so an unguarded effect would ask again
    // each time the failed fetch settles.
    const settled = findMany.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(findMany.mock.calls.length).toBe(settled);
    expect(screen.getByRole('button', { name: 'Load more' })).toBeTruthy();
  });
});
