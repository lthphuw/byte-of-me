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
 *
 * `searchNotes` runs for real against a faked `prisma.$queryRaw`, the way
 * `search-notes.spec.ts` fakes it: BOTH of that action's paths are raw
 * statements now (the empty-query "recents" path became one too), so a fake
 * on the `note` DELEGATE stubs nothing the action reaches and every render
 * below opened a real connection — the failure `test-setup.ts` exists to make
 * loud. `Object.defineProperty`, not `spyOn`, for the reason AGENTS §10 gives.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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

/** A row off `searchNotes`'s raw statements — snake_case, as Postgres returns it. */
interface FakeFtsRow {
  id: string;
  title: string;
  updated_at: Date;
  snippet: string;
}

// Shaped like the app's real cuids — no lexical relationship whatsoever to
// "kafka", the query the test below searches for. If cmdk's own client-side
// filter were still active (the default; `shouldFilter` unset), scoring
// this string against "kafka" would fuzzy-match nothing and hide the item
// outright. That is the entire failure `shouldFilter={false}` on the
// `Command` this component renders exists to prevent.
const KAFKA_NOTE: FakeFtsRow = {
  id: 'ckv3x9f7a0001abcdefgh1234',
  title: 'Kafka notes',
  updated_at: new Date('2026-08-01T00:00:00.000Z'),
  snippet: 'consumer group rebalance protocol',
};

let queryRawImpl: () => Promise<FakeFtsRow[]>;
const queryRaw = mock(() => queryRawImpl());

Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
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

/** Resolves the NEXT `$queryRaw` call only once `release()` runs, so a test
 *  can assert on exactly what is on screen while the search is still in
 *  flight — same technique as `note-editor.spec.tsx`'s `gateNextUpdateMany`. */
function gateNextQueryRaw(rows: FakeFtsRow[]): { release: () => void } {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  queryRawImpl = async () => {
    await gate;
    return rows;
  };
  return { release };
}

beforeEach(() => {
  queryRawImpl = () => Promise.resolve([]);
  queryRaw.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('NoteSearchPalette', () => {
  test('a result whose id does not resemble the query still renders (shouldFilter contract)', async () => {
    queryRawImpl = () => Promise.resolve([KAFKA_NOTE]);

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
    'shows the loading placeholder while the search is still in flight',
    async () => {
      const { release } = gateNextQueryRaw([]);
      const queryClient = makeQueryClient();
      render(<Harness open queryClient={queryClient} />);

      // By NAME, not by text. The pending state is a skeleton now — result-
      // shaped bars instead of a centred "Searching…" line — so the string
      // lives on the container's `aria-label` rather than in the document
      // text. The contract this test defends is unchanged and is the reason
      // the file exists: on the FIRST render, with `CommandEmpty` out of the
      // picture, the palette says something is in flight and says neither
      // "no matches" nor "it failed".
      const pending = screen.getByLabelText('Searching…');
      expect(pending.getAttribute('aria-busy')).toBe('true');
      expect(screen.queryByText('No notes match.')).toBeNull();
      expect(screen.queryByText('Could not load your notes.')).toBeNull();

      // The contract above is already proven; what is left is hygiene. The
      // gated fetch has to settle before this test ends, or its resolution
      // lands mid-way through a LATER test and surfaces as an act() warning
      // attributed to whichever one happens to be running.
      //
      // UNMOUNT FIRST, then release. With no mounted tree there is no render
      // to wait for, so this no longer depends on wall-clock at all. The
      // previous version released while mounted and waited for the loading
      // copy to disappear — a chain of gate → queryFn → TanStack → React that
      // was already widened to a 15s `waitFor` once, and under
      // `turbo run test` (five workspaces sharing the CPU) went on to blow
      // even the 20s per-test cap at 25.2s. A settle that has to be given a
      // bigger number every year is measuring the machine, not the code.
      cleanup();
      release();
      // One macrotask yield: enough for the gate's `await` and the action's
      // own microtasks to drain. Bounded, and not polling for a condition.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  );

  test('shows the load-error copy when the search fails', async () => {
    queryRawImpl = () => Promise.reject(new Error('db down'));

    const queryClient = makeQueryClient();
    render(<Harness open queryClient={queryClient} />);

    expect(await screen.findByText('Could not load your notes.')).toBeTruthy();
    // `queryByLabelText`, not `queryByText`: the pending state is a skeleton
    // whose string is an `aria-label`, so a text query would pass whether or
    // not the placeholder was still on screen — a vacuous assertion.
    expect(screen.queryByLabelText('Searching…')).toBeNull();
    expect(screen.queryByText('No notes match.')).toBeNull();
  });

  test('shows the empty copy for a genuine zero-result search', async () => {
    const queryClient = makeQueryClient();
    render(<Harness open queryClient={queryClient} />);

    expect(await screen.findByText('No notes match.')).toBeTruthy();
    // See the load-error test: the placeholder is named, not written out.
    expect(screen.queryByLabelText('Searching…')).toBeNull();
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
    // scenario the one under test — a second `$queryRaw` call would mean
    // this accidentally exercised a refetch instead of the pure warm-cache
    // render I2 was about.
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No notes match.')).toBeTruthy();
  });
});
