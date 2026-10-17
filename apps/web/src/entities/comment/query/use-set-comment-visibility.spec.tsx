/**
 * Hiding or restoring a comment marks every cached comment list stale, not only the admin page: a
 * blog's public thread shows the same comment. Prisma's `comment` delegate is a stub that echoes
 * the update.
 */
import type { ReactNode } from 'react';
import { commentKeys } from '@byte-of-me/contracts/comment';
import { prisma } from '@byte-of-me/db';
import { makeQueryClient } from '@byte-of-me/query';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

// The catalogue lives outside `src/`, so only a relative path reaches it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';

import { useSetCommentVisibility } from './use-set-comment-visibility';

const COMMENT_ID = 'cl9ebqhxk00003b600tymydho';
const messages = { dashboard: { comment: en.dashboard.comment } };

const originalComment = Object.getOwnPropertyDescriptor(prisma, 'comment');

beforeAll(() => {
  Object.defineProperty(prisma, 'comment', {
    value: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { isDeleted: boolean };
      }) => ({ id: where.id, isDeleted: data.isDeleted }),
    },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  if (originalComment) {
    Object.defineProperty(prisma, 'comment', originalComment);
  }
});

afterEach(cleanup);

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="en" messages={messages}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  };
}

describe('useSetCommentVisibility', () => {
  it('marks every cached comment list stale after a hide, not only the admin page', async () => {
    const spySuccess = spyOn(toast, 'success').mockImplementation(() => 1);
    const client = makeQueryClient();
    const thread = commentKeys.thread('blog-1', 10);
    const adminPage = commentKeys.adminList(1);
    client.setQueryData(thread, []);
    client.setQueryData(adminPage, []);

    const { result } = renderHook(() => useSetCommentVisibility(), {
      wrapper: wrapperFor(client),
    });
    act(() => {
      result.current.mutate({ commentId: COMMENT_ID, hidden: true });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(thread)?.isInvalidated).toBe(true);
    expect(client.getQueryState(adminPage)?.isInvalidated).toBe(true);
    expect(spySuccess).toHaveBeenCalledWith('Comment hidden');
    spySuccess.mockRestore();
  });
});
