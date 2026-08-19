/**
 * What this defends: a collaborator's keystrokes must reach the server on
 * every way OFF this surface, and a save that fails must be reported
 * somewhere that outlives the component.
 *
 * The bug this suite was written for: the workspace keyed the editor on the
 * note id, so clicking a sibling in the rail REMOUNTED it, and the unmount
 * effect used to call `clearTimeout` and nothing else — up to one debounce of
 * typing discarded with no error, no toast and no trace. The same hole was
 * open on tab close and on the tab being backgrounded, and the `save`
 * mutation had no `onError` at all, so a refused save was a four-word status
 * line that unmounted with the component.
 *
 * That `key` is now gone (it also cost the editor its undo history on every
 * rail click), so the departure has to survive a shape it was never written
 * against: the component STAYS MOUNTED and reseeds. The flush contracts below
 * are therefore load-bearing twice over — once for the keystrokes, once for
 * proving the reseed cannot get in front of them.
 *
 * `updateSharedNote` is NOT stubbed: it runs for real against a faked
 * `prisma`, the way `update-shared-note.spec.ts` does, so these tests also
 * exercise the real `resolveNoteAccess` grant walk — the VIEWER refusal below
 * is the production permission check failing, not a constructed error object
 * (AGENTS §10). `LazyRichTextEditor` is stubbed globally by the
 * `lazy-rich-text-editor.test-stub.ts` preload; `__typeInBody` stands in for
 * the author typing.
 *
 * Fake timers are deliberately not used, for the reason
 * `note-editor.spec.tsx` gives. Every flush contract here is asserted BEFORE
 * the debounce could have fired, so only the one "the debounce still works"
 * test pays real time.
 */
import { StrictMode } from 'react';
import { prisma } from '@byte-of-me/db';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';
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
  mock,
  spyOn,
  test,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

import { SharedNoteEditor } from './shared-note-editor';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';
// Imported from the stub's own path rather than the specifier it intercepts,
// for the reason `note-editor.spec.tsx` records: `tsc` resolves the
// intercepted specifier to the real component, which has no `__typeInBody`.
import {
  __getMountedValues,
  __resetMountedValues,
  __typeInBody,
} from '@/shared/ui/lazy-rich-text-editor.test-stub';
import { SHARED_AUTOSAVE_DELAY_MS } from '@/widgets/notes/shared-note-workspace/lib/use-shared-note-autosave';

/** A hand-written subset of `messages/en.json`'s `share.note` namespace, for
 *  the reason `note-editor.spec.tsx` gives (that file lives outside `src/`,
 *  where the import-alias rule has no path to it). Values match it exactly —
 *  assertions below query on the rendered text. */
const messages = {
  share: {
    note: {
      saving: 'Saving…',
      saved: 'Saved',
      saveFailed: 'Not saved',
      retrySave: 'Retry',
      conflict: {
        title: 'This note changed while you were editing',
        description:
          'Someone else saved it {serverAt}. Your changes from {localAt} have not been applied.',
        keepMine: 'Keep mine',
        takeServer: 'Use theirs',
      },
      errors: {
        save: 'Could not save the note.',
        conflict:
          'Your changes were not saved — someone else edited this note first.',
      },
    },
  },
  // `as const`, like `note-editor.spec.tsx`: the generated message
  // declarations type every value as its own literal, so widened `string`s do
  // not satisfy `NextIntlClientProvider`'s `messages`.
} as const;

function doc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
}

const INITIAL_CONTENT = doc('Draft');
/** A second note's body, distinct enough to read out of a mounted editor. */
const SECOND_CONTENT = doc('Second');
/** What the OTHER editor saved while this reader was typing. */
const SERVER_CONTENT = doc('Theirs');

/** The version the reader opened, as milliseconds. */
const BASE_UPDATED_AT = 1_700_000_000_000;
/** The version that beat them to it. */
const SERVER_UPDATED_AT = new Date(BASE_UPDATED_AT + 5_000);

/**
 * Shorter than the debounce, deliberately. A departure flush is immediate, so
 * every assertion about one has to settle before the 800ms timer could have
 * fired — otherwise the test passes on a stale timer and says nothing about
 * whether the departure sent anything, which is exactly how the first draft
 * of this suite stayed green with the flush deleted.
 */
const BEFORE_DEBOUNCE = { timeout: SHARED_AUTOSAVE_DELAY_MS / 2 };

const EDITOR_GRANT = [
  { root_id: 'folder-a', owner_id: 'owner-1', depth: 1, role: 'EDITOR' },
];
const VIEWER_GRANT = [
  { root_id: 'folder-a', owner_id: 'owner-1', depth: 1, role: 'VIEWER' },
];

const queryRaw = mock();
const updateMany = mock();
const findFirst = mock();
const linkDeleteMany = mock();
const linkFindMany = mock();
const linkCreateMany = mock();
const transaction = mock();

beforeAll(() => {
  // `Object.defineProperty`, not `spyOn`: Prisma 7 synthesizes a fresh
  // function on every delegate property access, so a spy is bypassed
  // (AGENTS §10).
  Object.defineProperty(prisma, '$queryRaw', {
    value: queryRaw,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'note', {
    value: { updateMany, findFirst },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'noteLink', {
    value: {
      findMany: linkFindMany,
      deleteMany: linkDeleteMany,
      createMany: linkCreateMany,
    },
    writable: true,
    configurable: true,
  });
});

let toastError: ReturnType<typeof spyOn>;

beforeEach(() => {
  setTestUser({ id: 'user-bob', role: 'USER', email: 'bob@example.com' });
  queryRaw.mockReset().mockResolvedValue(EDITOR_GRANT);
  updateMany.mockReset().mockResolvedValue({ count: 1 });
  linkFindMany.mockReset().mockResolvedValue([]);
  linkDeleteMany.mockReset().mockResolvedValue({ count: 0 });
  linkCreateMany.mockReset().mockResolvedValue({ count: 0 });
  transaction.mockReset().mockResolvedValue([]);
  findFirst.mockReset().mockResolvedValue({
    id: 'note-1',
    title: 'Retro',
    content: INITIAL_CONTENT,
    parentId: 'folder-a',
    createdAt: new Date(0),
    updatedAt: new Date(BASE_UPDATED_AT),
    status: 'draft',
    properties: null,
    isFolder: false,
  });
  __resetMountedValues();
  toastError = spyOn(toast, 'error').mockImplementation(() => '');
});

afterEach(() => {
  cleanup();
  toastError.mockRestore();
});

afterAll(resetTestUser);

function Harness({
  noteId,
  content = INITIAL_CONTENT,
}: {
  noteId: string;
  content?: string;
}) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      {/* `timeZone` pinned: the conflict banner formats two timestamps, and
          without one next-intl falls back to the runtime zone and logs an
          `ENVIRONMENT_FALLBACK` per render. */}
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        {/* Mounted exactly as `shared-note-workspace.tsx` mounts it: with NO
            `key`. A rail click changes these props on the SAME component
            instance, which is what a note switch has to look like here — the
            old `key={data.id}` remount is the thing that threw the editor's
            undo history away, and rerendering with a key would silently test
            a shape production no longer has. */}
        <SharedNoteEditor
          noteId={noteId}
          initialContent={content}
          initialUpdatedAt={new Date(BASE_UPDATED_AT)}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** Puts the server ahead of the reader: the guarded write matches nothing,
 *  and the row it did not overwrite comes back newer. */
function serverMovedOn(): void {
  updateMany.mockResolvedValue({ count: 0 });
  findFirst.mockResolvedValue({
    content: SERVER_CONTENT,
    updatedAt: SERVER_UPDATED_AT,
  });
}

/**
 * How many times some text is on screen.
 *
 * Counted rather than asserted as `queryByText(...) === null`, because a
 * FAILING assertion on a happy-dom element prints that element — and printing
 * one walks `ownerDocument.defaultView`, which serialises the entire window.
 * Confirmed while mutation-testing this suite: a single such failure took the
 * run from 7 seconds to over two minutes of output.
 */
function timesOnScreen(text: string): number {
  return screen.queryAllByText(text).length;
}

/** The document the most recently mounted editor was seeded with, as text. */
function lastMountedText(): string {
  const values = __getMountedValues();
  return JSON.stringify(values[values.length - 1] ?? null);
}

/** Every `note.updateMany` the suite has seen, as `[id, plain text]`. */
function writes(): [string, string][] {
  return updateMany.mock.calls.map((call) => {
    const args = call[0] as {
      where: { id: string };
      data: { content?: string };
    };
    return [args.where.id, richTextToPlainText(args.data.content)];
  });
}

describe('SharedNoteEditor autosave', () => {
  test('flushes a pending edit when the editor unmounts', async () => {
    const view = render(<Harness noteId="note-1" />);
    act(() => __typeInBody(' and more'));

    // Before the debounce could ever have fired: this is the whole point.
    expect(updateMany).not.toHaveBeenCalled();
    view.unmount();

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft and more']);
  });

  test('flushes under the DEPARTING note id when a sibling opens', async () => {
    const view = render(<Harness noteId="note-1" />);
    act(() => __typeInBody(' and more'));

    // A rail click. The component survives it now, so this exercises
    // `useDepartureFlush`'s KEY-CHANGE branch rather than its unmount one —
    // the exact swap Task 2 made, and the half that would silently stop
    // sending if the reseed ever ran ahead of the flush.
    view.rerender(<Harness noteId="note-2" content={SECOND_CONTENT} />);

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft and more']);
  });

  test('reseeds the document when a sibling opens, without a remount', async () => {
    const view = render(<Harness noteId="note-1" />);
    expect(__getMountedValues()).toHaveLength(1);
    expect(lastMountedText()).toContain('Draft');

    view.rerender(<Harness noteId="note-2" content={SECOND_CONTENT} />);

    // The component instance is preserved by React (no `key`), so the ONLY
    // thing that can put the new note on screen is the hook's reseed. Without
    // it the editor keeps showing note-1's body under note-2's id, and the
    // first keystroke saves one note's text over the other's.
    await waitFor(() => expect(__getMountedValues()).toHaveLength(2));
    expect(lastMountedText()).toContain('Second');
  });

  test('drops a stale save status when a sibling opens', async () => {
    // One mutation observer now serves every note this component opens.
    // Unscoped, note-1's failure left "Not saved" and a Retry over note-2 —
    // a button that would have written note-2's own buffer back and called it
    // a recovery.
    queryRaw.mockResolvedValue(VIEWER_GRANT);
    const view = render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));
    await screen.findByText('Not saved', undefined, {
      timeout: SHARED_AUTOSAVE_DELAY_MS + 1500,
    });

    view.rerender(<Harness noteId="note-2" content={SECOND_CONTENT} />);

    // Waits on the reseed landing — a POSITIVE condition — and only then
    // asserts the absence. `waitFor` on "this text is gone" cannot fail: with
    // the text still there it just keeps polling.
    await waitFor(() => expect(lastMountedText()).toContain('Second'));
    expect(timesOnScreen('Not saved')).toBe(0);
    expect(timesOnScreen('Retry')).toBe(0);
  });

  test('flushes a pending edit on pagehide', async () => {
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));

    fireEvent(window, new Event('pagehide'));

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft!']);
  });

  test('flushes when the tab is backgrounded, but not when it returns', async () => {
    // `Object.defineProperty`, not `spyOn`: `visibilityState` is an accessor
    // and Bun's `spyOn` refuses those outright.
    let visibility: DocumentVisibilityState = 'visible';
    const original = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'visibilityState'
    );
    Object.defineProperty(document, 'visibilityState', {
      get: () => visibility,
      configurable: true,
    });

    try {
      render(<Harness noteId="note-1" />);
      act(() => __typeInBody('!'));

      visibility = 'hidden';
      fireEvent(document, new Event('visibilitychange'));
      await waitFor(
        () => expect(updateMany).toHaveBeenCalledTimes(1),
        BEFORE_DEBOUNCE
      );

      // Coming back must not re-send: nothing has changed since, and a second
      // write would be pure noise on the owner's row.
      visibility = 'visible';
      fireEvent(document, new Event('visibilitychange'));
      await waitFor(
        () => expect(updateMany).toHaveBeenCalledTimes(1),
        BEFORE_DEBOUNCE
      );
    } finally {
      // `Reflect.deleteProperty`, not `delete`: `visibilityState` is declared
      // readonly, which `delete` refuses at the type level.
      Reflect.deleteProperty(document, 'visibilityState');
      if (original) {
        Object.defineProperty(Document.prototype, 'visibilityState', original);
      }
    }
  });

  test('sends nothing when a note is merely opened and left', async () => {
    // The rich-text editor reports a document of its own as it opens (heading
    // ids, parse-time attribute defaults) marked `initial`. Acting on it would
    // write every visited note back over itself under the OWNER's id, bumping
    // their `updatedAt` and rebuilding their link graph for a change nobody
    // made. StrictMode is deliberate: it runs a fresh mount's effects
    // setup → cleanup → setup, so the departure flush fires between them.
    const view = render(
      <StrictMode>
        <Harness noteId="note-1" />
      </StrictMode>
    );
    await screen.findByTestId('fake-rich-text-editor');
    view.unmount();

    await waitFor(() => expect(queryRaw).not.toHaveBeenCalled());
    expect(updateMany).not.toHaveBeenCalled();
  });

  test('still saves on the debounce while the editor stays open', async () => {
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));

    await waitFor(() => expect(updateMany).toHaveBeenCalledTimes(1), {
      timeout: SHARED_AUTOSAVE_DELAY_MS + 1500,
    });
    expect(writes()[0]).toEqual(['note-1', 'Draft!']);
    expect(await screen.findByText('Saved')).toBeDefined();
  });
});

describe('SharedNoteEditor save failures', () => {
  test('reports a refused save that lands after the editor is gone', async () => {
    // The dead-observer case, and the reason the departure flush does not go
    // through `save.mutate`: the mutation belongs to a component that is
    // unmounting, and `onError` on a dead observer never fires. The toast is
    // rendered by the root provider, so it outlives this component — the
    // status line does not.
    queryRaw.mockResolvedValue(VIEWER_GRANT);

    const view = render(<Harness noteId="note-1" />);
    act(() => __typeInBody(' and more'));
    view.unmount();

    await waitFor(
      () => expect(toastError).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(toastError.mock.calls[0][0]).toBe('Could not save the note.');
    expect(updateMany).not.toHaveBeenCalled();
  });

  test('offers a retry after a refused debounced save, and it resends', async () => {
    queryRaw.mockResolvedValue(VIEWER_GRANT);
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));

    // The debounce has to elapse before there is anything to fail.
    const retry = await screen.findByRole(
      'button',
      { name: 'Retry' },
      { timeout: SHARED_AUTOSAVE_DELAY_MS + 1500 }
    );
    expect(screen.getByText('Not saved')).toBeDefined();
    expect(toastError).toHaveBeenCalledTimes(1);

    // A refused save leaves the buffer unchanged, so nothing re-arms the
    // debounce — without this button the edit sits on screen with no way back.
    queryRaw.mockResolvedValue(EDITOR_GRANT);
    fireEvent.click(retry);

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft!']);
  });

  test('a conflicted departure flush is reported where the banner cannot be', async () => {
    // The banner unmounts with the page; the toast does not. A conflicted
    // departure is the one case where the reader's version ceases to exist,
    // so it has to be said out loud rather than only drawn.
    serverMovedOn();
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));

    fireEvent(window, new Event('pagehide'));

    await waitFor(
      () => expect(toastError).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(toastError.mock.calls[0][0]).toBe(
      'Your changes were not saved — someone else edited this note first.'
    );
  });

  test('a failed departure flush is retried by the next departure', async () => {
    queryRaw.mockResolvedValue(VIEWER_GRANT);
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody('!'));

    fireEvent(window, new Event('pagehide'));
    await waitFor(
      () => expect(toastError).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );

    // The failure put the "last sent" marker back, so the edit is still owed
    // a save. A save that failed must never look like one that landed.
    queryRaw.mockResolvedValue(EDITOR_GRANT);
    fireEvent(window, new Event('pagehide'));

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft!']);
  });
});

/**
 * Detection is the server's (`updateSharedNote` writes only over the row this
 * buffer was built on); this is the half that turns a refusal into a choice
 * the reader can actually make. What it cannot do is stated in
 * `useSharedNoteAutosave`: the comparison happens at save time, so nothing
 * here notices another editor while the reader is merely reading.
 */
describe('SharedNoteEditor edit conflicts', () => {
  /** Types, waits for the debounced save to be refused, and returns. */
  async function raiseConflict() {
    serverMovedOn();
    render(<Harness noteId="note-1" />);
    act(() => __typeInBody(' and more'));

    await screen.findByText(
      'This note changed while you were editing',
      undefined,
      { timeout: SHARED_AUTOSAVE_DELAY_MS + 1500 }
    );
  }

  test('offers both versions instead of overwriting somebody else', async () => {
    await raiseConflict();

    expect(screen.getByRole('button', { name: 'Keep mine' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Use theirs' })).toBeDefined();
    // No red toast: nothing failed, and the reader is being asked a question
    // rather than told about an error.
    expect(toastError).not.toHaveBeenCalled();
  });

  test('taking theirs replaces the document and sends nothing', async () => {
    await raiseConflict();
    const refusedSaves = updateMany.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Use theirs' }));

    // The editor is uncontrolled after mount, so accepting the other version
    // has to REMOUNT it — that is what `seedGeneration` is for. Without it the
    // buffer would take theirs while the screen kept showing the reader's own.
    await waitFor(() => expect(lastMountedText()).toContain('Theirs'));
    expect(timesOnScreen('This note changed while you were editing')).toBe(0);
    // Their version is now the buffer too, so there is nothing owed a save.
    await waitFor(() =>
      expect(updateMany.mock.calls.length).toBe(refusedSaves)
    );
  });

  test('keeping mine resends against the version it was shown', async () => {
    await raiseConflict();
    const refusedSaves = updateMany.mock.calls.length;
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({
      updatedAt: new Date(SERVER_UPDATED_AT.getTime() + 1_000),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

    await waitFor(() =>
      expect(updateMany.mock.calls.length).toBe(refusedSaves + 1)
    );
    const resend = updateMany.mock.calls[refusedSaves]?.[0] as {
      where: { updatedAt?: { lte: Date } };
    };
    // Rebased onto the row the reader was actually SHOWN, never onto whatever
    // is current: anything written after it is a disagreement they have not
    // seen, and the server has to be able to raise it again.
    expect(resend.where.updatedAt).toEqual({ lte: SERVER_UPDATED_AT });
    expect(writes()[refusedSaves]).toEqual(['note-1', 'Draft and more']);
  });

  test('a conflict on one note does not follow the reader to the next', async () => {
    serverMovedOn();
    const view = render(<Harness noteId="note-1" />);
    act(() => __typeInBody(' and more'));
    await screen.findByText(
      'This note changed while you were editing',
      undefined,
      { timeout: SHARED_AUTOSAVE_DELAY_MS + 1500 }
    );

    view.rerender(<Harness noteId="note-2" content={SECOND_CONTENT} />);

    // Autosave is suspended while a banner is up. Carried across a note
    // switch it would suspend saving on a note it was never about. Sequenced
    // on the reseed rather than on the banner disappearing, for the reason
    // the status test above records.
    await waitFor(() => expect(lastMountedText()).toContain('Second'));
    expect(timesOnScreen('This note changed while you were editing')).toBe(0);
  });
});
