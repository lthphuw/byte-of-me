/**
 * Stub for `@/shared/ui/lazy-rich-text-editor` in component specs.
 *
 * The real `LazyRichTextEditor` is a `next/dynamic` chunk wrapping
 * `@byte-of-me/ui/rich-text-editor` — ~570 KB of Tiptap/ProseMirror (see that
 * file's own comment). Loading the real thing in a spec would mean: pulling
 * in every `@tiptap/*` package for a unit test, exercising ProseMirror's own
 * `contentEditable`/Selection behavior against happy-dom (which does not
 * fully implement it), and testing Tiptap rather than this app's code. A
 * lightweight double that records what it was mounted with is enough for the
 * C1 regression test ("was the editor mounted with the loaded note's
 * content, or a stale buffer"). It also exposes `__typeInBody`, so a spec can
 * simulate an edit to the body specifically — needed once the I2 fix (round
 * 2 of this feature's review) turned out to only have been verified through
 * the title input, which cannot see a bug specific to how the rich-text
 * editor (unlike a plain `<input>`) stays mounted and uncontrolled after its
 * first render.
 *
 * A double is only as good as the behaviour it reproduces. This one used to
 * be strictly MORE PASSIVE than the component it replaces: it emitted only
 * when a spec called `__typeInBody`, while the real editor reports a
 * document of its own the moment it opens one (see `normalizeLikeTiptap`
 * below for what and why). Every guard in `use-note-editor-autosave.ts` was
 * therefore validated against an editor that never speaks first — and the
 * spurious "save on open" that manual smoke testing found in 2026-08 walked
 * straight through the 192-test suite because of it. It now emits on mount,
 * unconditionally, for every spec in this file's blast radius; a spec that
 * needs "nothing has happened yet" has to be written against an editor that
 * has already said something, which is what production actually does.
 *
 * `note-editor.tsx` imports `LazyRichTextEditor` as a plain STATIC import
 * (`import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor'`),
 * which resolves before that file's own top-level code runs. Registering
 * this stub from inside a spec file would lose that race — a spec file's own
 * `import` statements resolve before the rest of that file's top-level code,
 * per ordinary ESM semantics, so a `plugin()` call placed there executes too
 * late to intercept its own file's import of the component under test. It
 * has to live in a preload instead, exactly like `next-runtime-stubs.ts`'s
 * three stubs and for the same reason (see that file's own comment). Global
 * in scope, but inert everywhere else: confirmed (`grep -rl
 * "lazy-rich-text-editor" src --include="*.spec.*"`) that nothing else in
 * the suite imports this specifier, and no other `.spec.tsx` exists yet —
 * this is the first component spec in `apps/web`.
 *
 * Lives under `src/shared/ui/`, not at the `apps/web` root next to
 * `next-runtime-stubs.ts`/`happydom.ts`: `note-editor.spec.tsx` needs to
 * import this file's own `__getMountedValues`/`__resetMountedValues` (`tsc`
 * resolves the intercepted specifier, `@/shared/ui/lazy-rich-text-editor`, to
 * the real, on-disk component, which has no such exports — see that spec's
 * own comment), and `eslint-plugin-import-alias`'s `relativeDepth: 0` rule
 * only allows a same-directory relative import or the `@/` alias, which only
 * covers `src/*`. The suffix is `.test-stub.ts`, not `.spec.ts`, so `bun
 * test`'s file discovery does not also try to run this as a test file — it
 * has no `describe`/`test` blocks, only the `plugin()` registration.
 */
import * as React from 'react';
import { plugin } from 'bun';

/** Mirrors `RichTextChangeMeta` in
 *  `packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx`. Declared
 *  structurally rather than imported so this preload does not pull the real
 *  editor module (and all of tiptap) into every spec's graph purely for a
 *  type — the whole reason this stub exists. If that type ever grows a
 *  field, this has to grow it too; `note-editor.tsx` type-checks against the
 *  REAL one, so a drift shows up as a type error there, not as a silently
 *  passing test. */
interface FakeRichTextChangeMeta {
  initial: boolean;
}

interface FakeRichTextEditorProps {
  value?: unknown;
  onChange?: (json: unknown, meta: FakeRichTextChangeMeta) => void;
  /** Recorded (see `__getCurrentProps`) so a spec can assert the raw-markdown
   *  toggle actually reaches the editor. The stub renders nothing either way —
   *  raw mode is the real component's behavior, not this double's. */
  markdownMode?: boolean;
  /** Recorded only; the stub never reports an outline. */
  onOutlineChange?: (items: unknown[]) => void;
}

// What each mounted instance of the fake editor was seeded with, in mount
// order. A `key` change on the real element (see `note-editor.tsx`) always
// unmounts and remounts a fresh Tiptap instance rather than updating one in
// place — this stub reproduces exactly that shape: it records `value` once,
// the moment it first appears, and never again for that same instance.
let mountedValues: unknown[] = [];

// The CURRENTLY mounted instance's `value`/`onChange`, so `__typeInBody` can
// simulate an edit without a spec having to reach into the component tree.
// Only ever one instance mounted at a time in this suite (a `key` change
// unmounts the old one before the new one's first render), so a pair of
// module-level slots — updated at the same point `mountedValues` is, on
// first render of each new instance — is enough; no need to track a
// collection keyed by instance.
let currentValue: unknown;
let currentOnChange: FakeRichTextEditorProps['onChange'];
let currentProps: FakeRichTextEditorProps | undefined;

export function __getMountedValues(): unknown[] {
  return mountedValues;
}

/** The props of the CURRENTLY mounted instance, as of its latest render. */
export function __getCurrentProps(): FakeRichTextEditorProps | undefined {
  return currentProps;
}

export function __resetMountedValues(): void {
  mountedValues = [];
  currentValue = undefined;
  currentOnChange = undefined;
  currentProps = undefined;
}

/** Best-effort plain-text reader for the small subset of Tiptap JSON this
 *  suite's fixtures use (`doc(text)` in `note-editor.spec.tsx`) — walks
 *  `content` arrays and concatenates `text` nodes. Not a general Tiptap
 *  reader; this stub never needs to be one. */
function extractPlainText(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractPlainText).join('');
  }
  return '';
}

/**
 * The document the real editor holds — and reports — once it has finished
 * opening a stored one, which is NOT byte-identical to what it was seeded
 * with. Two normalisations were confirmed against the real component
 * (`packages/ui/src/rich-text-editor/tiptap/rich-text-editor.spec.tsx`
 * exercises them):
 *
 * 1. Parsing fills in every declared attribute, so `TextAlign`'s
 *    `textAlign: null` appears on paragraphs and headings that were stored
 *    without it.
 * 2. `TableOfContents` (registered whenever `compact` is false, which is how
 *    `note-editor.tsx` renders it) assigns a fresh `id`/`data-toc-id` to
 *    every heading that lacks one, in a transaction dispatched while the
 *    editor is opening — a real document change, which is why the real
 *    editor emits at all at that point.
 *
 * A counter stands in for the real extension's `uuid()` so the fake stays
 * deterministic; nothing here asserts on the id itself, only that the
 * reported document differs from the seed the way the real one does.
 */
let headingIdCounter = 0;

function normalizeLikeTiptap(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeLikeTiptap);
  if (!value || typeof value !== 'object') return value;

  const node = value as {
    type?: string;
    attrs?: Record<string, unknown>;
    content?: unknown[];
  };
  const next: Record<string, unknown> = { ...node };

  if (node.type === 'paragraph' || node.type === 'heading') {
    next.attrs = { textAlign: null, ...node.attrs };
  }
  if (node.type === 'heading' && !node.attrs?.['data-toc-id']) {
    headingIdCounter += 1;
    const id = `toc-${headingIdCounter}`;
    next.attrs = { ...(next.attrs as Record<string, unknown>), id, 'data-toc-id': id };
  }
  if (Array.isArray(node.content)) {
    next.content = node.content.map(normalizeLikeTiptap);
  }

  return next;
}

/**
 * Simulates the author typing in the body: reads the plain text out of
 * whatever the CURRENTLY MOUNTED instance was seeded with, appends `extra`,
 * and invokes that instance's `onChange` with a document built on top of it
 * — deliberately DERIVED from the mounted value rather than an arbitrary
 * caller-supplied document, because that is what the real Tiptap editor's
 * `onUpdate` always does (report a document that descends from what is
 * currently live), and it is specifically what makes a stale-buffer /
 * stale-editor split observable: if the editor were still showing the
 * PREVIOUS note's body when this is called, the emitted document would
 * carry that previous body forward, not the new note's.
 */
export function __typeInBody(extra: string): void {
  if (!currentOnChange) {
    throw new Error(
      '__typeInBody called with no FakeRichTextEditor currently mounted'
    );
  }
  const baseText = extractPlainText(currentValue);
  currentOnChange(
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `${baseText}${extra}` }],
        },
      ],
    },
    // An author edit, the one thing an autosave must always act on.
    { initial: false }
  );
}

function FakeRichTextEditor(props: FakeRichTextEditorProps) {
  const recordedRef = React.useRef(false);
  // The document THIS instance opened with, normalised — see
  // `normalizeLikeTiptap`. Per-instance rather than read back off
  // `currentValue` inside the effect below, so the emit cannot pick up a
  // different instance's document if the two ever overlap.
  const openedWithRef = React.useRef<unknown>(undefined);

  if (!recordedRef.current) {
    recordedRef.current = true;
    // The RAW `value`, deliberately: this is what specs assert the editor was
    // MOUNTED with (the C1 regression), which is about the prop this
    // component was handed, not about what it does with it afterwards.
    mountedValues.push(props.value);
    openedWithRef.current = normalizeLikeTiptap(props.value);
    currentValue = openedWithRef.current;
  }
  currentOnChange = props.onChange;
  currentProps = props;

  // The real editor REPORTS that normalised document through `onUpdate` while
  // it opens — verified against the real component, not assumed: Tiptap emits
  // `create` from a `setTimeout(0)` after the view mounts, the
  // `TableOfContents` extension's `onCreate` dispatches its id-assigning
  // transaction inside that emit, and a doc-changing transaction is exactly
  // what `onUpdate` fires on. An effect (rather than a call during render) is
  // the closest React equivalent of that timing.
  //
  // This is the passivity that let the spurious-autosave bug through: the
  // stub used to emit ONLY when a spec called `__typeInBody`, so the entire
  // autosave machinery was validated against an editor that never spoke
  // first, while the real one always does. `initial: true` is the real
  // editor's own marker for "this document is what I had to do to open
  // yours, not something the author did" — a consumer that ignores it is
  // exactly the bug this reproduces.
  const emittedRef = React.useRef(false);
  const onChange = props.onChange;
  React.useEffect(() => {
    if (emittedRef.current) return;
    emittedRef.current = true;
    onChange?.(openedWithRef.current, { initial: true });
    // Mount only: a remount means a different editor instance (the `key`
    // changes), which gets its own ref and therefore its own initial emit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement('div', {
    'data-testid': 'fake-rich-text-editor',
  });
}

plugin({
  name: 'stub-lazy-rich-text-editor',
  setup(build) {
    build.module('@/shared/ui/lazy-rich-text-editor', () => ({
      exports: {
        LazyRichTextEditor: FakeRichTextEditor,
        __getMountedValues,
        __getCurrentProps,
        __resetMountedValues,
        __typeInBody,
      },
      loader: 'object',
    }));
  },
});
