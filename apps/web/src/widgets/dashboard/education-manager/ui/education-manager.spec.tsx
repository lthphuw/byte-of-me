/**
 * The education editor must never open on a list row: the list drops every
 * achievement, so the form may mount only once the by-id entry has arrived.
 * Drives the real manager, dialog and server actions; only Prisma is replaced.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { QueryClientProvider } from '@tanstack/react-query';
import {
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

import { EducationManager } from './education-manager';

import { educationKeys } from '@/entities/education/model/query-keys';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { makeQueryClient } from '@/shared/lib/query/get-query-client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const listRow = {
  id: 'edu-1',
  createdAt: NOW,
  updatedAt: NOW,
  sortOrder: 0,
  startDate: new Date('2020-09-01T00:00:00.000Z'),
  endDate: null,
  logoId: null,
  userId: 'admin-1',
  logo: null,
  translations: [{ id: 'tr-1', language: 'en', title: 'Hanoi University' }],
  _count: { achievements: 1 },
};

const fullEntry = {
  ...listRow,
  translations: [
    {
      id: 'tr-1',
      language: 'en',
      title: 'Hanoi University',
      description: null,
    },
  ],
  achievements: [
    {
      id: 'ach-1',
      createdAt: NOW,
      updatedAt: NOW,
      sortOrder: 0,
      educationId: 'edu-1',
      translations: [
        { id: 'atr-1', language: 'en', title: 'Dean list', content: null },
      ],
      images: [],
    },
  ],
};

const meta = { currentPage: 1, totalPages: 1, totalCount: 1, hasMore: false };

type Row = Record<string, unknown>;
const findFirst = mock<(args: unknown) => Promise<Row | null>>();
const findMany = mock<(args: unknown) => Promise<Row[]>>();
const count = mock<(args: unknown) => Promise<number>>();
const txUpdate = mock<(args: unknown) => Promise<Row>>();
const txFindFirst = mock<(args: unknown) => Promise<Row | null>>();
const txAchievement = {
  create: mock<(args: unknown) => Promise<Row>>(),
  update: mock<(args: unknown) => Promise<Row>>(),
  deleteMany: mock<(args: unknown) => Promise<Row>>(),
};

const originals = {
  education: Object.getOwnPropertyDescriptor(prisma, 'education'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};
Object.defineProperty(prisma, 'education', {
  value: { findFirst, findMany, count },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      education: { findFirst: txFindFirst, update: txUpdate },
      educationAchievement: txAchievement,
    }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});
const toastSuccess = spyOn(toast, 'success').mockImplementation(() => 1);

/** A promise the test settles by hand, to hold the by-id fetch open. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderManager() {
  const queryClient = makeQueryClient();
  // What the page's server prefetch leaves in the cache.
  queryClient.setQueryData(educationKeys.adminPage(1), {
    data: [listRow],
    meta,
  });
  // The logo picker reads the media library; an empty one keeps this spec off
  // the media server action.
  queryClient.setQueryData(mediaKeys.infinite(12), {
    pages: [
      {
        data: [],
        meta: { currentPage: 1, totalPages: 1, totalCount: 0, hasMore: false },
      },
    ],
    pageParams: [1],
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={{ dashboard: en.dashboard }}>
        <EducationManager />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return queryClient;
}

const openEditor = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Edit Hanoi University' }));

/** A field only the form renders. */
const formField = () => screen.queryByText('Institution Logo');

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset().mockResolvedValue([listRow]);
  count.mockReset().mockResolvedValue(1);
  txFindFirst.mockReset().mockResolvedValue({ achievements: [] });
  txUpdate.mockReset().mockResolvedValue(listRow);
  txAchievement.create.mockReset().mockResolvedValue({});
  txAchievement.update.mockReset().mockResolvedValue({});
  txAchievement.deleteMany.mockReset().mockResolvedValue({});
  logError.mockClear();
  toastSuccess.mockClear();
});

afterEach(cleanup);

afterAll(() => {
  if (originals.education)
    Object.defineProperty(prisma, 'education', originals.education);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  logError.mockRestore();
  toastSuccess.mockRestore();
});

describe('EducationManager', () => {
  it('renders the server-prefetched page without reading the list again', () => {
    renderManager();

    expect(screen.getByText('Hanoi University')).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('keeps the form unmounted, and saving disabled, until the full entry arrives', async () => {
    const entry = deferred<Row | null>();
    findFirst.mockReturnValue(entry.promise);
    renderManager();

    openEditor();

    expect(await screen.findByLabelText('Loading…')).toBeTruthy();
    expect(formField()).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    entry.resolve(fullEntry);

    expect(await screen.findByText('Institution Logo')).toBeTruthy();
    expect(screen.getByDisplayValue('Hanoi University')).toBeTruthy();
    expect(screen.queryByLabelText('Loading…')).toBeNull();
  });

  it('seeds the form with the achievements only the by-id read carries', async () => {
    findFirst.mockResolvedValue(fullEntry);
    renderManager();

    openEditor();

    expect(await screen.findByText('Dean list')).toBeTruthy();
  });

  it('keeps the form unmounted when the by-id fetch fails, and Retry recovers', async () => {
    findFirst.mockRejectedValueOnce(new Error('connection lost'));
    renderManager();

    openEditor();

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(formField()).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    findFirst.mockResolvedValue(fullEntry);
    fireEvent.click(retry);

    expect(await screen.findByText('Institution Logo')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('treats an entry that no longer exists as a failed load, not an empty form', async () => {
    findFirst.mockResolvedValue(null);
    renderManager();

    openEditor();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(formField()).toBeNull();
  });

  it('after a save, drops the cached entry and refreshes the list', async () => {
    findFirst.mockResolvedValue(fullEntry);
    const queryClient = renderManager();
    openEditor();
    await screen.findByText('Institution Logo');
    expect(queryClient.getQueryData(educationKeys.detail('edu-1'))).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(queryClient.getQueryData(educationKeys.detail('edu-1'))).toBeUndefined();
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    // The save went through the real action, with the entry's own achievement.
    expect(txAchievement.update).toHaveBeenCalledTimes(1);
  });
});
