/**
 * Regression cover for the two things review round found wrong with this
 * component, both invisible from reading the code: cmdk's own client-side
 * filter would hide every real, server-matched result if `shouldFilter`
 * were ever left at its default (the entire reason that prop is set below),
 * and `CommandEmpty`'s first-render ref guard silently blanked the loading/
 * error/empty copy on the exact renders they exist for — see this
 * component's own comment for the mechanism. `NoteTreePanel` needs no
 * comparable spec for that second failure mode because it never used
 * `CommandEmpty` (or any cmdk primitive) to begin with.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { NoteSearchPalette } from './note-search-palette';

const messages = {
  dashboard: {
    note: {
      search: {
        placeholder: 'Search your notes…',
        loading: 'Searching…',
        empty: 'No notes match.',
      },
      errors: {
        load: 'Could not load your notes.',
      },
    },
  },
} as const;

interface FakeNoteRow {
  id: string;
  title: string;
  updatedAt: Date;
  plainText: string;
}

// Shaped like the app's real cuids — no lexical relationship whatsoever to
// "kafka", the query the test below searches for. If cmdk's own client-side
// filter were still active (the default; `shouldFilter` unset), scoring
// this string against "kafka" would fuzzy-match nothing and hide the item
// outright. That is the entire failure `shouldFilter={false}` on the
// `Command` this component renders exists to prevent.
const KAFKA_NOTE: FakeNoteRow = {
  id: 'ckv3x9f7a0001abcdefgh1234',
  title: 'Kafka notes',
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  plainText: 'consumer group rebalance protocol',
};

let findManyImpl: () => Promise<FakeNoteRow[]>;
const findMany = mock(() => findManyImpl());
const count = mock(() => Promise.resolve(0));

Object.defineProperty(prisma, 'note', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

function makeQueryClient(): QueryClient {
  return new QueryClient({
    // `staleTime` matches `get-query-client.ts`'s real default — the
    // "reopen reuses the warm cache" test below depends on it.
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
}

function Harness({
  open,
  queryClient,
}: {
  open: boolean;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <NoteSearchPalette
          open={open}
          onOpenChange={() => {}}
          onSelect={() => {}}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** Resolves the NEXT `findMany` call only once `release()` runs, so a test
 *  can assert on exactly what is on screen while the search is still in
 *  flight — same technique as `note-editor.spec.tsx`'s `gateNextUpdateMany`. */
function gateNextFindMany(rows: FakeNoteRow[]): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  findManyImpl = async () => {
    await gate;
    return rows;
  };
  return { release };
}

beforeEach(() => {
  findManyImpl = () => Promise.resolve([]);
  findMany.mockClear();
  count.mockClear();
  count.mockResolvedValue(0);
});

afterEach(() => {
  cleanup();
});

describe('NoteSearchPalette', () => {
  test('a result whose id does not resemble the query still renders (shouldFilter contract)', async () => {
    findManyImpl = () => Promise.resolve([KAFKA_NOTE]);
    count.mockResolvedValue(1);

    const queryClient = makeQueryClient();
    render(<Harness open queryClient={queryClient} />);
    expect(await screen.findByText('Kafka notes')).toBeTruthy();

    // Cmdk's own client-side filter runs off `CommandInput`'s live
    // (undebounced) `value`, not the debounced term the server query uses —
    // so it reacts to a keystroke immediately, with no need to wait out
    // `SEARCH_DEBOUNCE_MS`. The mocked search result above is already
    // rendered before this point regardless of what's typed (an empty term
    // fetches everything); what this asserts is that TYPING a query that
    // looks nothing like the item's `value` (the note id) does not then
    // make cmdk hide it — the actual `shouldFilter={false}` contract. Without
    // that prop, cmdk would score `KAFKA_NOTE.id` against "kafka" and hide
    // the item the instant this fires.
    fireEvent.change(screen.getByPlaceholderText('Search your notes…'), {
      target: { value: 'kafka' },
    });

    expect(screen.getByText('Kafka notes')).toBeTruthy();
  });

  test(
    'shows the loading copy while the search is still in flight',
    async () => {
      const { release } = gateNextFindMany([]);
      const queryClient = makeQueryClient();
      render(<Harness open queryClient={queryClient} />);

      expect(screen.getByText('Searching…')).toBeTruthy();
      expect(screen.queryByText('No notes match.')).toBeNull();
      expect(screen.queryByText('Could not load your notes.')).toBeNull();

      // Let the gated fetch settle fully before the test (and its cleanup)
      // ends — otherwise the eventual state update can land after this test
      // has already moved on, surfacing as an act() warning attributed to
      // whichever test happens to be running when the microtask finally
      // flushes.
      release();
      await waitFor(
        () => {
          expect(screen.queryByText('Searching…')).toBeNull();
        },
        // Generous on purpose: under `turbo run test` all five workspaces'
        // suites share the CPU, and this settle has been observed taking
        // >10s wall-clock there while passing in ~100ms standalone. The
        // widened window only matters on the failure path — a green run
        // exits as soon as the copy disappears.
        { timeout: 15_000 }
      );
    },
    // bun's per-test cap must outlast the waitFor above.
    20_000
  );

  test('shows the load-error copy when the search fails', async () => {
    findManyImpl = () => Promise.reject(new Error('db down'));

    const queryClient = makeQueryClient();
    render(<Harness open queryClient={queryClient} />);

    expect(await screen.findByText('Could not load your notes.')).toBeTruthy();
    expect(screen.queryByText('Searching…')).toBeNull();
    expect(screen.queryByText('No notes match.')).toBeNull();
  });

  test('shows the empty copy for a genuine zero-result search', async () => {
    const queryClient = makeQueryClient();
    render(<Harness open queryClient={queryClient} />);

    expect(await screen.findByText('No notes match.')).toBeTruthy();
    expect(screen.queryByText('Searching…')).toBeNull();
    expect(screen.queryByText('Could not load your notes.')).toBeNull();
  });

  test('a reopen that reuses a warm, empty-result cache still shows the empty copy, not a blank list', async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(<Harness open queryClient={queryClient} />);
    await screen.findByText('No notes match.');

    await act(async () => {
      rerender(<Harness open={false} queryClient={queryClient} />);
    });
    await act(async () => {
      rerender(<Harness open queryClient={queryClient} />);
    });

    // Still within `staleTime`: no second fetch. This is what makes the
    // scenario the one under test — a second `findMany` call would mean
    // this accidentally exercised a refetch instead of the pure warm-cache
    // render I2 was about.
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No notes match.')).toBeTruthy();
  });
});
