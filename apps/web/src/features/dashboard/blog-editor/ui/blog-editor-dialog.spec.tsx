/**
 * Escape closes a post with no edits at once: the editor's own normalised copy
 * of the body on open (`meta.initial`) is not an edit. A real edit still asks.
 * The option queries are primed, so no server action or database is reached.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { BlogEditorDialog } from './blog-editor-dialog';

import type { AdminBlog } from '@/entities/blog';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { projectQueries } from '@/entities/project/query/project-queries';
import { tagQueries } from '@/entities/tag/query/tag-queries';
import { workspaceSettingsKeys } from '@/entities/workspace-settings/model/query-keys';
import { WORKSPACE_SETTINGS_DEFAULTS } from '@/entities/workspace-settings/model/settings-schema';
import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import { __getEditorProps } from '@/shared/ui/lazy-rich-text-editor.test-stub';

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';
const date = new Date('2026-01-01T00:00:00.000Z');
const DISCARD_TITLE = en.dashboard.shared.crud.discardTitle;

/** A stored body, as the database holds it: a TipTap document in a string. */
const STORED_BODY = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Stored body' }] },
  ],
});

function existingPost(): AdminBlog {
  return {
    id: BLOG_ID,
    createdAt: date,
    updatedAt: date,
    slug: 'hello-world',
    publishedDate: date,
    isPublished: true,
    userId: 'user-1',
    projectId: null,
    readingTime: null,
    coverImageId: null,
    coverImage: null,
    project: null,
    translations: [
      {
        id: 'bt-en',
        blogId: BLOG_ID,
        createdAt: date,
        updatedAt: date,
        language: 'en',
        title: 'Hello world',
        description: null,
        content: STORED_BODY,
      },
    ],
    tags: [],
  };
}

function renderDialog(
  initialData: AdminBlog | null,
  onOpenChange: (open: boolean) => void
) {
  const queryClient = makeQueryClient();
  queryClient.setQueryData(tagQueries.options('en').queryKey, []);
  queryClient.setQueryData(projectQueries.options('en').queryKey, []);
  queryClient.setQueryData(mediaKeys.infinite(12), {
    pages: [
      {
        data: [],
        meta: { currentPage: 1, totalPages: 1, totalCount: 0, hasMore: false },
      },
    ],
    pageParams: [1],
  });
  queryClient.setQueryData(
    workspaceSettingsKeys.current(),
    WORKSPACE_SETTINGS_DEFAULTS
  );

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={en}>
        <BlogEditorDialog
          open
          onOpenChange={onOpenChange}
          isEditing
          initialData={initialData}
          onSubmit={() => {}}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('BlogEditorDialog Escape', () => {
  it('closes an existing post with no edits at once, without asking', () => {
    const onOpenChange = mock(() => {});
    renderDialog(existingPost(), onOpenChange);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it('closes a new post with no edits at once, without asking', () => {
    const onOpenChange = mock(() => {});
    renderDialog(null, onOpenChange);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it('still asks before dropping a real edit', () => {
    const onOpenChange = mock(() => {});
    renderDialog(existingPost(), onOpenChange);
    const editor = __getEditorProps()[0];

    act(() => {
      editor?.onChange?.(
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Typed' }],
            },
          ],
        },
        { initial: false }
      );
    });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.queryByText(DISCARD_TITLE)).not.toBeNull();
  });
});
