/**
 * What this defends: a collaborator's keystrokes must reach the server on
 * every way OFF this surface, and a save that fails must be reported
 * somewhere that outlives the component.
 *
 * The bug this suite was written for: the workspace keys the editor on the
 * note id, so clicking a sibling in the rail REMOUNTS it, and the unmount
 * effect used to call `clearTimeout` and nothing else — up to one debounce of
 * typing discarded with no error, no toast and no trace. The same hole was
 * open on tab close and on the tab being backgrounded, and the `save`
 * mutation had no `onError` at all, so a refused save was a four-word status
 * line that unmounted with the component.
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
  __resetMountedValues,
  __typeInBody,
} from '@/shared/ui/lazy-rich-text-editor.test-stub';
import { SHARED_AUTOSAVE_DELAY_MS } from '@/widgets/shared/shared-note-workspace/lib/use-shared-note-autosave';

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
      errors: { save: 'Could not save the note.' },
    },
  },
  // `as const`, like `note-editor.spec.tsx`: the generated message
  // declarations type every value as its own literal, so widened `string`s do
  // not satisfy `NextIntlClientProvider`'s `messages`.
} as const;

const INITIAL_CONTENT = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Draft' }] }],
});

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
    updatedAt: new Date(0),
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

function Harness({ noteId }: { noteId: string }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <NextIntlClientProvider locale="en" messages={messages}>
        {/* Keyed exactly as `shared-note-workspace.tsx` keys it, so a note
            switch here remounts the editor the same way a rail click does. */}
        <SharedNoteEditor
          key={noteId}
          noteId={noteId}
          initialContent={INITIAL_CONTENT}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
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

    // A rail click: the workspace's `key` changes, React unmounts the old
    // editor and mounts a fresh one. The edit belongs to the note being left.
    view.rerender(<Harness noteId="note-2" />);

    await waitFor(
      () => expect(updateMany).toHaveBeenCalledTimes(1),
      BEFORE_DEBOUNCE
    );
    expect(writes()[0]).toEqual(['note-1', 'Draft and more']);
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
