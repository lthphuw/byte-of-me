/**
 * What the owner can do on the featured-work dashboard: read the list, reorder
 * it, and edit an entry. An edit opens on the full row loaded by id, and a save
 * must write every language's body back, even when the owner never touched it.
 * Drives the real manager, dialog, form and server actions; only Prisma is replaced.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { QueryClientProvider } from '@tanstack/react-query';
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
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { FeaturedWorkManager } from './featured-work-manager';

import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import type { AdminFeaturedWork } from '@/entities/featured-work/model/types';
import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import {
  __getEditorProps,
  __getMountedValues,
  __resetMountedValues,
} from '@/shared/ui/lazy-rich-text-editor.test-stub';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function work(
  id: string,
  sortOrder: number,
  translations: AdminFeaturedWork['translations'],
  extra: Partial<AdminFeaturedWork> = {}
): AdminFeaturedWork {
  return {
    id,
    createdAt: NOW,
    updatedAt: NOW,
    sortOrder,
    isPublished: true,
    url: null,
    userId: 'admin-1',
    translations,
    ...extra,
  };
}

const tr = (language: string, title: string, description: string | null = null) => ({
  id: `${language}-${title}`,
  language,
  title,
  description,
});

const rows = [
  work('w1', 0, [tr('en', 'Faster export')], {
    url: 'https://www.github.com/a/b/pull/1',
  }),
  work('w2', 1, [tr('en', 'Quantized model'), tr('vi', 'Mô hình lượng tử')]),
  work('w3', 2, [tr('en', 'Release notes')], { isPublished: false }),
];

const meta = (totalCount: number) => ({
  currentPage: 1,
  totalPages: 1,
  totalCount,
  hasMore: false,
});

type Row = Record<string, unknown>;
const findFirst = mock<(args: unknown) => Promise<Row | null>>();
const findMany = mock<(args: unknown) => Promise<Row[]>>();
const count = mock<(args: unknown) => Promise<number>>();
const aggregate = mock<(args: unknown) => Promise<Row>>();
const create = mock<(args: unknown) => Promise<Row>>();
const remove = mock<(args: unknown) => Promise<Row>>();
const txFindFirst = mock<(args: unknown) => Promise<Row | null>>();
const txFindMany = mock<(args: unknown) => Promise<Row[]>>();
const txUpdate = mock<(args: unknown) => Promise<Row>>();

const originals = {
  featuredWork: Object.getOwnPropertyDescriptor(prisma, 'featuredWork'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};
Object.defineProperty(prisma, 'featuredWork', {
  value: { findFirst, findMany, count, aggregate, create, delete: remove },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      featuredWork: {
        findFirst: txFindFirst,
        findMany: txFindMany,
        update: txUpdate,
      },
    }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});
const toastSuccess = spyOn(toast, 'success').mockImplementation(() => 1);
const toastError = spyOn(toast, 'error').mockImplementation(() => 1);

function renderManager(
  list: AdminFeaturedWork[] = rows,
  locale: 'en' | 'vi' = 'en'
) {
  const queryClient = makeQueryClient();
  // What the page's server prefetch leaves in the cache.
  queryClient.setQueryData(featuredWorkKeys.adminPage(1), {
    data: list,
    meta: meta(list.length),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={{ dashboard: en.dashboard }}>
        <FeaturedWorkManager />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return queryClient;
}

/**
 * Compared by label, not as nodes: a failed `toBe` between two DOM nodes
 * diffs their React fiber props, which are circular and hang the run.
 */
const focusedLabel = () => document.activeElement?.getAttribute('aria-label');

const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;

const doc = (text: string) =>
  JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
const EN_BODY = doc('Calibrated on 512 COCO images.');
const VI_BODY = doc('Đã hiệu chỉnh trên 512 ảnh COCO.');

/** What the database hands the by-id read: the list row's fields, each body, and the demo pair's join rows. */
function detailOf(list: AdminFeaturedWork, bodies: Record<string, string> = {}) {
  return {
    ...list,
    media: [],
    translations: list.translations.map((t) => ({
      id: t.id,
      language: t.language,
      title: t.title,
      description: t.description,
      details: bodies[t.language] ?? null,
    })),
  };
}

/** The translations the last update wrote: `deleteMany` then `create`. */
function savedTranslations() {
  const args = txUpdate.mock.calls[0]?.[0] as {
    data: {
      translations: {
        create: Array<{
          language: string;
          title: string;
          description: string | null;
          details: string | null;
        }>;
      };
    };
  };
  return args.data.translations.create;
}

const openEdit = (name: string) => fireEvent.click(button(`Edit ${name}`));

/** Radix `TabsTrigger` selects on `mousedown`, not on `click`. */
const clickTab = (label: string) =>
  act(() => {
    fireEvent.mouseDown(screen.getByRole('tab', { name: label }), { button: 0 });
  });

/** Waits until the form is in: the English tab is open, so one title shows. */
const formLoaded = () =>
  waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());

/** A promise the test settles by hand, to hold the by-id read open. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  findFirst.mockReset().mockResolvedValue(null);
  findMany.mockReset().mockResolvedValue(rows);
  count.mockReset().mockResolvedValue(rows.length);
  aggregate.mockReset().mockResolvedValue({ _max: { sortOrder: 2 } });
  create.mockReset().mockResolvedValue(rows[0] ?? {});
  remove.mockReset().mockResolvedValue({});
  txFindFirst.mockReset().mockResolvedValue({ id: 'w1' });
  txFindMany.mockReset().mockResolvedValue(
    rows.map(({ id, sortOrder }) => ({ id, sortOrder }))
  );
  txUpdate.mockReset().mockResolvedValue({});
  __resetMountedValues();
  logError.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

afterEach(cleanup);

afterAll(() => {
  if (originals.featuredWork)
    Object.defineProperty(prisma, 'featuredWork', originals.featuredWork);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  logError.mockRestore();
  toastSuccess.mockRestore();
  toastError.mockRestore();
});

describe('FeaturedWorkManager list', () => {
  it('renders the prefetched page, numbered, without reading the list again', () => {
    renderManager();

    expect(screen.getByText('Faster export')).toBeTruthy();
    expect(screen.getByText('github.com')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('resolves each title against the dashboard locale', () => {
    renderManager(rows, 'vi');

    expect(screen.getByText('Mô hình lượng tử')).toBeTruthy();
    // No Vietnamese text: falls back to English.
    expect(screen.getByText('Faster export')).toBeTruthy();
  });

  it('marks an unpublished entry as a draft and a live one as published', () => {
    renderManager();

    expect(screen.getAllByText('Draft')).toHaveLength(1);
    expect(screen.getAllByText('Published')).toHaveLength(2);
  });

  it('offers the create action when there is nothing yet', () => {
    renderManager([]);

    expect(screen.getByText('No featured works yet')).toBeTruthy();
    fireEvent.click(button('Add Your First Entry'));

    expect(screen.getByText('Add featured work', { selector: 'h2' })).toBeTruthy();
  });
});

describe('FeaturedWorkManager reorder', () => {
  const isDisabled = (name: string) =>
    button(name).getAttribute('aria-disabled') === 'true';

  it('marks moving up on the first entry and down on the last as disabled', () => {
    renderManager();

    expect(isDisabled('Move Faster export up')).toBe(true);
    expect(isDisabled('Move Faster export down')).toBe(false);
    expect(isDisabled('Move Release notes up')).toBe(false);
    expect(isDisabled('Move Release notes down')).toBe(true);
  });

  it('keeps the edge buttons focusable and inert', () => {
    renderManager();
    const first = button('Move Faster export up');
    const last = button('Move Release notes down');

    first.focus();
    fireEvent.click(first);
    last.focus();
    fireEvent.click(last);

    expect(first.disabled).toBe(false);
    expect(last.disabled).toBe(false);
    expect(focusedLabel()).toBe('Move Release notes down');
    expect(txFindMany).not.toHaveBeenCalled();
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('moves the entry through the action, then refreshes the list', async () => {
    renderManager();

    fireEvent.click(button('Move Quantized model up'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(2));
    expect(
      txUpdate.mock.calls
        .map((c) => c[0] as { where: { id: string }; data: { sortOrder: number } })
        .map((a) => [a.where.id, a.data.sortOrder])
        .sort()
    ).toEqual([
      ['w1', 1],
      ['w2', 0],
    ]);
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps focus on the arrow that was pressed, before and after the list reorders', async () => {
    findMany.mockResolvedValue([rows[1], rows[0], rows[2]] as Row[]);
    renderManager();
    const up = button('Move Quantized model up');

    up.focus();
    fireEvent.click(up);

    // Not `disabled`: a disabled button would drop focus to <body> at once.
    await waitFor(() => expect(up.getAttribute('aria-disabled')).toBe('true'));
    expect(focusedLabel()).toBe('Move Quantized model up');
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    // The refetch moved the entry to the top; its arrow still holds focus.
    await waitFor(() => {
      const moved = button('Move Quantized model up');
      expect(moved.getAttribute('aria-disabled')).toBe('true');
      expect(focusedLabel()).toBe('Move Quantized model up');
    });
    // Idle again: the same arrow of the next row can be pressed.
    expect(isDisabled('Move Faster export up')).toBe(false);
  });

  it('does not pull focus back when the user has moved on during the move', async () => {
    let release!: (rows: Row[]) => void;
    txFindMany.mockReturnValue(
      new Promise<Row[]>((resolve) => {
        release = resolve;
      })
    );
    renderManager();
    const up = button('Move Quantized model up');

    up.focus();
    fireEvent.click(up);
    await waitFor(() => expect(up.getAttribute('aria-disabled')).toBe('true'));
    const edit = button('Edit Release notes');
    edit.focus();

    release(rows.map(({ id, sortOrder }) => ({ id, sortOrder })));
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(button('Move Faster export up').getAttribute('aria-disabled')).toBe(
        'true'
      )
    );
    await waitFor(() => expect(up.getAttribute('aria-disabled')).toBe('false'));
    expect(focusedLabel()).toBe('Edit Release notes');
  });

  it('ignores a second press while a move is in flight', async () => {
    let release!: (rows: Row[]) => void;
    txFindMany.mockReturnValue(
      new Promise<Row[]>((resolve) => {
        release = resolve;
      })
    );
    renderManager();
    const down = button('Move Faster export down');

    down.focus();
    fireEvent.click(down);
    await waitFor(() => expect(down.getAttribute('aria-disabled')).toBe('true'));
    fireEvent.click(down);
    expect(focusedLabel()).toBe('Move Faster export down');

    release(rows.map(({ id, sortOrder }) => ({ id, sortOrder })));
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    expect(txFindMany).toHaveBeenCalledTimes(1);
  });

  it('says so when the move fails, and writes nothing', async () => {
    txFindMany.mockRejectedValue(new Error('connection lost'));
    renderManager();

    fireEvent.click(button('Move Quantized model down'));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Could not change the order')
    );
    expect(txUpdate).not.toHaveBeenCalled();
  });
});

describe('FeaturedWorkManager editor', () => {
  it('submits only the English text when Vietnamese is left blank', async () => {
    renderManager([]);

    fireEvent.click(button('Add featured work'));
    const [enTitle] = screen.getAllByLabelText('Title');
    fireEvent.change(enTitle as HTMLElement, { target: { value: ' Faster export ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add featured work' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        sortOrder: 3,
        isPublished: false,
        translations: {
          create: [{ language: 'en', title: 'Faster export', details: null }],
        },
      },
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it('keeps an empty form from saving, naming the missing title', async () => {
    renderManager([]);

    fireEvent.click(button('Add featured work'));
    fireEvent.click(screen.getByRole('button', { name: 'Add featured work' }));

    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows the repeated-language error the server would only call invalid', async () => {
    const dup = work('w9', 0, [tr('en', 'First'), tr('en', 'Second')]);
    findFirst.mockResolvedValue(detailOf(dup));
    renderManager([dup]);

    openEdit('First');
    await formLoaded();
    fireEvent.click(button('Save changes'));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Each language may appear once'
    );
    expect(txUpdate).not.toHaveBeenCalled();
  });
});

describe('FeaturedWorkManager edit loads the full row', () => {
  it('keeps the form unmounted, and saving disabled, until the full row arrives', async () => {
    const row = deferred<Row | null>();
    findFirst.mockReturnValue(row.promise);
    renderManager();

    openEdit('Faster export');

    expect(await screen.findByLabelText('Loading…')).toBeTruthy();
    // Editing from the first click on: the title must not flip to "Add" while loading.
    expect(screen.getByText('Edit featured work', { selector: 'h2' })).toBeTruthy();
    expect(screen.queryAllByLabelText('Title')).toHaveLength(0);
    expect(button('Save changes').disabled).toBe(true);

    row.resolve(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));

    await formLoaded();
    expect(screen.queryByLabelText('Loading…')).toBeNull();
    expect(button('Save changes').disabled).toBe(false);
  });

  it('seeds the English editor with the stored body once the row arrives', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    renderManager();

    openEdit('Faster export');
    await formLoaded();

    expect(__getMountedValues()).toContainEqual(JSON.parse(EN_BODY));
    expect(screen.getByText('Details')).toBeTruthy();
  });

  it('shows a retry when the row fails to load, and recovers on Retry', async () => {
    findFirst.mockRejectedValueOnce(new Error('connection lost'));
    renderManager();

    openEdit('Faster export');

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryAllByLabelText('Title')).toHaveLength(0);
    expect(button('Save changes').disabled).toBe(true);

    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    fireEvent.click(retry);

    await formLoaded();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('treats a row that no longer exists as a failed load, not an empty form', async () => {
    findFirst.mockResolvedValue(null);
    renderManager();

    openEdit('Faster export');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryAllByLabelText('Title')).toHaveLength(0);
  });

  it('saving without touching the editor writes the stored body back unchanged', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    renderManager();

    openEdit('Faster export');
    await formLoaded();
    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(1));
    // The editor reports its own normalised copy on open; that is not an edit.
    expect(savedTranslations()).toEqual([
      { language: 'en', title: 'Faster export', description: null, details: EN_BODY },
    ]);
  });

  it('writes no body when the row has none', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork));
    renderManager();

    openEdit('Faster export');
    await formLoaded();
    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(1));
    expect(savedTranslations()[0]).toMatchObject({ language: 'en', details: null });
  });

  it('clearing the editor saves no body', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    renderManager();

    openEdit('Faster export');
    await formLoaded();
    const [englishEditor] = __getEditorProps();
    act(() => {
      englishEditor?.onChange?.(
        { type: 'doc', content: [{ type: 'paragraph' }] },
        { initial: false }
      );
    });
    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(1));
    expect(savedTranslations()[0]).toMatchObject({ language: 'en', details: null });
  });

  it('submits a stored Vietnamese body the owner never opened', async () => {
    findFirst.mockResolvedValue(
      detailOf(rows[1] as AdminFeaturedWork, { en: EN_BODY, vi: VI_BODY })
    );
    renderManager();

    openEdit('Quantized model');
    await formLoaded();
    // The Vietnamese tab is never shown: its editor was never mounted.
    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(1));
    expect(savedTranslations()).toEqual([
      { language: 'en', title: 'Quantized model', description: null, details: EN_BODY },
      { language: 'vi', title: 'Mô hình lượng tử', description: null, details: VI_BODY },
    ]);
  });

  it('keeps an edited Vietnamese body through a switch to English and back', async () => {
    const edited = doc('Bản đã sửa.');
    findFirst.mockResolvedValue(
      detailOf(rows[1] as AdminFeaturedWork, { en: EN_BODY, vi: VI_BODY })
    );
    renderManager();

    openEdit('Quantized model');
    await formLoaded();
    clickTab('VI');
    const [viEditor] = __getEditorProps();
    act(() => {
      viEditor?.onChange?.(JSON.parse(edited), { initial: false });
    });
    clickTab('EN');
    clickTab('VI');
    // The Vietnamese editor is seeded back with what the owner typed.
    expect(__getMountedValues()).toContainEqual(JSON.parse(edited));
    clickTab('EN');
    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(txUpdate).toHaveBeenCalledTimes(1));
    expect(savedTranslations()).toEqual([
      { language: 'en', title: 'Quantized model', description: null, details: EN_BODY },
      { language: 'vi', title: 'Mô hình lượng tử', description: null, details: edited },
    ]);
  });

  it('brings a tab holding a body without a title forward, with its error', async () => {
    renderManager([]);

    fireEvent.click(button('Add featured work'));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Faster export' },
    });
    clickTab('VI');
    const [viEditor] = __getEditorProps();
    act(() => {
      viEditor?.onChange?.(JSON.parse(doc('Chỉ có nội dung.')), { initial: false });
    });
    clickTab('EN');
    fireEvent.click(screen.getByRole('button', { name: 'Add featured work' }));

    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'VI' }).getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('after a save, drops the cached row and refreshes the list', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    const queryClient = renderManager();

    openEdit('Faster export');
    await formLoaded();
    expect(queryClient.getQueryData(featuredWorkKeys.detail('w1'))).toBeDefined();

    fireEvent.click(button('Save changes'));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(queryClient.getQueryData(featuredWorkKeys.detail('w1'))).toBeUndefined();
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
  });

  it('after a delete, drops the cached row', async () => {
    findFirst.mockResolvedValue(detailOf(rows[0] as AdminFeaturedWork, { en: EN_BODY }));
    const queryClient = renderManager();

    openEdit('Faster export');
    await formLoaded();
    fireEvent.click(button('Cancel'));
    await waitFor(() => expect(screen.queryAllByLabelText('Title')).toHaveLength(0));
    expect(queryClient.getQueryData(featuredWorkKeys.detail('w1'))).toBeDefined();

    fireEvent.click(button('Delete Faster export'));
    fireEvent.click(button('Delete'));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(queryClient.getQueryData(featuredWorkKeys.detail('w1'))).toBeUndefined();
  });
});
