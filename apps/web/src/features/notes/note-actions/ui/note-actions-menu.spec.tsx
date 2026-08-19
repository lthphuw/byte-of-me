/**
 * What this spec defends: a note row nobody has touched costs nothing in
 * TanStack observers.
 *
 * Both menu surfaces render `DeleteNoteDialog` and `ShareNoteDialog`
 * unconditionally, passing `open` as a prop, and they have to — Radix unmounts
 * a menu's content the moment an item is selected, so a confirmation owned by
 * the menu would close with it. The hazard that creates is that everything
 * inside those dialogs used to mount with the ROW: `useNoteMutations()` builds
 * four mutations to use one, the share dialog holds three more, and a desktop
 * row renders BOTH surfaces. Measured with this harness before the fix: 14
 * mutation observers and 6 query observers per row — 560 and 240 across the
 * forty rows below.
 *
 * The counters are read off the two caches rather than estimated from the
 * source. A `QueryObserver` announces itself to the query cache as
 * `observerAdded` when it subscribes; a `MutationObserver` calls
 * `client.defaultMutationOptions()` from its constructor's `setOptions`, which
 * notifies the mutation cache as `observerOptionsUpdated` (the first call can
 * never be a no-op — `shallowEqualObjects(options, undefined)` is false). Both
 * events carry the observer itself, so a `Set` of identities is an exact live
 * count and not a count of renders.
 *
 * The second test is what stops the first from passing for the wrong reason:
 * deleting the dialogs entirely would also report zero.
 */
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it — the
// same exemption `i18n-parity.spec.ts` takes. The real strings rather than a
// hand-written subset: `NextIntlClientProvider` is typed against the exact
// literals of `en.json`, so a trimmed copy is a type error rather than a
// convenience.
// eslint-disable-next-line import-alias/import-alias
import messages from '../../../../../messages/en.json';

import { DeleteNoteDialog } from './delete-note-dialog';
import { NoteActionsMenu } from './note-actions-menu';
import { NoteRowContextMenu } from './note-row-context-menu';
import { ShareNoteDialog } from './share-note-dialog';

/** The tree size the original measurement was quoted for. */
const ROWS = 40;

/**
 * A client that keeps a live count of the observers mounted against it.
 *
 * Subscribed before anything renders, so no observer can be constructed
 * without being seen.
 */
function countingClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const queryObservers = new Set<object>();
  const mutationObservers = new Set<object>();

  client.getQueryCache().subscribe((event) => {
    if (event.type === 'observerAdded') queryObservers.add(event.observer);
    if (event.type === 'observerRemoved') queryObservers.delete(event.observer);
  });
  client.getMutationCache().subscribe((event) => {
    if (event.type === 'observerOptionsUpdated') {
      mutationObservers.add(event.observer);
    }
  });

  return { client, queryObservers, mutationObservers };
}

function Providers({
  client,
  children,
}: {
  client: QueryClient;
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Enough of Prisma for the second test's dialogs to have something to call.
 * They are opened, so their queries do fire; what they resolve to is not what
 * is under test here, only that opening is what brings the observers into
 * existence. Applied per test rather than at module scope so a spec file
 * loaded before this one cannot leave a different fake in place.
 */
beforeEach(() => {
  Object.defineProperty(prisma, '$queryRaw', {
    value: mock(() => Promise.resolve([{ count: 0, email: null }])),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'noteShare', {
    value: { findMany: mock(() => Promise.resolve([])) },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
});

describe('note row menus', () => {
  test('a tree of untouched rows mounts no query or mutation observers', () => {
    const { client, queryObservers, mutationObservers } = countingClient();

    render(
      <Providers client={client}>
        {Array.from({ length: ROWS }, (_, index) => (
          <NoteRowContextMenu
            key={index}
            noteId={`note-${index}`}
            title={`Note ${index}`}
            isFolder={false}
            isArchived={false}
            isPinned={false}
          >
            <div data-testid="row">
              <NoteActionsMenu
                noteId={`note-${index}`}
                title={`Note ${index}`}
                isFolder={false}
                isArchived={false}
                isPinned={false}
              />
            </div>
          </NoteRowContextMenu>
        ))}
      </Providers>
    );

    // Both surfaces are really there, which is what makes the count below a
    // measurement of the real desktop row. `data-state` is what Radix's
    // `ContextMenuTrigger` writes onto the row it is given with `asChild`; the
    // menu bails out to a bare `<>{children}</>` on touch, and a spec that
    // silently measured the touch shape would be counting one surface.
    expect(
      screen.getAllByRole('button', { name: 'Note actions' })
    ).toHaveLength(ROWS);
    for (const row of screen.getAllByTestId('row')) {
      expect(row.hasAttribute('data-state')).toBe(true);
    }

    expect(mutationObservers.size).toBe(0);
    expect(queryObservers.size).toBe(0);
  });

  test('opening a dialog is what brings its observers into existence', () => {
    const { client, queryObservers, mutationObservers } = countingClient();

    render(
      <Providers client={client}>
        <DeleteNoteDialog
          noteId="note-1"
          title="Kafka"
          open
          onOpenChange={() => {}}
        />
      </Providers>
    );

    // The delete confirmation's two impact reads — the cascade count and the
    // share exposure — are exactly the fetches that must not happen for a row
    // nobody has touched, and exactly the ones that must happen the moment one
    // is opened.
    expect(queryObservers.size).toBe(2);
    // `useNoteMutations()` hands back four; the dialog takes `remove`. The
    // assertion is the direction, not the number, so narrowing that hook stays
    // a free change.
    expect(mutationObservers.size).toBeGreaterThan(0);

    render(
      <Providers client={client}>
        <ShareNoteDialog
          noteId="note-1"
          title="Kafka"
          isFolder={false}
          open
          onOpenChange={() => {}}
        />
      </Providers>
    );

    expect(queryObservers.size).toBe(3);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
