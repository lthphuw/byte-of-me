/**
 * The company editor must never open on a list row: the list drops every role
 * and task, so the form may mount only once the by-id record has arrived.
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

import { CompanyManager } from './company-manager';

import { companyKeys } from '@/entities/company/model/query-keys';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';
import { makeQueryClient } from '@/shared/lib/query/get-query-client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const listRow = {
  id: 'co-1',
  createdAt: NOW,
  updatedAt: NOW,
  company: 'Acme Corp',
  location: 'Hanoi',
  startDate: new Date('2021-03-01T00:00:00.000Z'),
  endDate: null,
  logoId: null,
  userId: 'admin-1',
  logo: null,
  _count: { roles: 1, techStacks: 0 },
};

const fullRecord = {
  ...listRow,
  translations: [],
  techStacks: [],
  roles: [
    {
      id: 'role-1',
      createdAt: NOW,
      updatedAt: NOW,
      companyId: 'co-1',
      startDate: null,
      endDate: null,
      translations: [
        { id: 'rtr-1', language: 'en', title: 'Staff Engineer', description: null },
      ],
      tasks: [],
    },
  ],
};

const meta = { currentPage: 1, totalPages: 1, totalCount: 1, hasMore: false };

type Row = Record<string, unknown>;
const findFirst = mock<(args: unknown) => Promise<Row | null>>();
const findMany = mock<(args: unknown) => Promise<Row[]>>();
const count = mock<(args: unknown) => Promise<number>>();
const txFindFirst = mock<(args: unknown) => Promise<Row | null>>();
const txUpdate = mock<(args: unknown) => Promise<Row>>();
const txRole = {
  create: mock<(args: unknown) => Promise<Row>>(),
  update: mock<(args: unknown) => Promise<Row>>(),
  deleteMany: mock<(args: unknown) => Promise<Row>>(),
};

const originals = {
  company: Object.getOwnPropertyDescriptor(prisma, 'company'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};
Object.defineProperty(prisma, 'company', {
  value: { findFirst, findMany, count },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      company: { findFirst: txFindFirst, update: txUpdate },
      role: txRole,
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
  queryClient.setQueryData(companyKeys.adminPage(1), {
    data: [listRow],
    meta,
  });
  // The pickers inside the form read these; seeding keeps the spec off the
  // media and tech-stack server actions.
  queryClient.setQueryData(techStackKeys.options(), []);
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
        <CompanyManager />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return queryClient;
}

const openEditor = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Edit Acme Corp' }));

/** A field only the form renders. */
const formField = () => screen.queryByText('Company Logo');

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset().mockResolvedValue([listRow]);
  count.mockReset().mockResolvedValue(1);
  txFindFirst.mockReset().mockResolvedValue({ roles: [] });
  txUpdate.mockReset().mockResolvedValue(listRow);
  txRole.create.mockReset().mockResolvedValue({});
  txRole.update.mockReset().mockResolvedValue({});
  txRole.deleteMany.mockReset().mockResolvedValue({});
  logError.mockClear();
  toastSuccess.mockClear();
});

afterEach(cleanup);

afterAll(() => {
  if (originals.company)
    Object.defineProperty(prisma, 'company', originals.company);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  logError.mockRestore();
  toastSuccess.mockRestore();
});

describe('CompanyManager', () => {
  it('renders the server-prefetched page without reading the list again', () => {
    renderManager();

    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('keeps the form unmounted until the full record arrives', async () => {
    const record = deferred<Row | null>();
    findFirst.mockReturnValue(record.promise);
    renderManager();

    openEditor();

    expect(await screen.findByLabelText('Loading…')).toBeTruthy();
    expect(formField()).toBeNull();

    record.resolve(fullRecord);

    expect(await screen.findByText('Company Logo')).toBeTruthy();
    expect(screen.getByDisplayValue('Acme Corp')).toBeTruthy();
    expect(screen.getByDisplayValue('Staff Engineer')).toBeTruthy();
    expect(screen.queryByLabelText('Loading…')).toBeNull();
  });

  it('keeps the form unmounted when the by-id fetch fails, and Retry recovers', async () => {
    findFirst.mockRejectedValueOnce(new Error('connection lost'));
    renderManager();

    openEditor();

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(formField()).toBeNull();

    findFirst.mockResolvedValue(fullRecord);
    fireEvent.click(retry);

    expect(await screen.findByText('Company Logo')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('treats a record that no longer exists as a failed load, not an empty form', async () => {
    findFirst.mockResolvedValue(null);
    renderManager();

    openEditor();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(formField()).toBeNull();
  });

  it('after a save, drops the cached record and refreshes the list', async () => {
    findFirst.mockResolvedValue(fullRecord);
    const queryClient = renderManager();
    openEditor();
    await screen.findByText('Company Logo');
    expect(queryClient.getQueryData(companyKeys.detail('co-1'))).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(queryClient.getQueryData(companyKeys.detail('co-1'))).toBeUndefined();
    await waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));
    // The save went through the real action, with the record's own role.
    expect(txRole.update).toHaveBeenCalledTimes(1);
  });
});
