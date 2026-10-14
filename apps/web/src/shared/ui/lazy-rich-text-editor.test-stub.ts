/**
 * Stand-in for `@/shared/ui/lazy-rich-text-editor` in component specs. The real
 * one is a ~570 KB Tiptap chunk, and a spec of this app should not exercise
 * ProseMirror under happy-dom. It records what each editor mounted with and,
 * like the real one, reports a normalised document on open (`initial: true`).
 *
 * Registered from a preload (`bunfig.toml`): a `plugin()` call inside a spec
 * runs after that spec's own static imports, so it would lose the race.
 */
import * as React from 'react';
import { plugin } from 'bun';

/** `RichTextChangeMeta`, declared here so this preload does not pull Tiptap into every spec. */
interface FakeRichTextChangeMeta {
  initial: boolean;
}

interface FakeRichTextEditorProps {
  value?: unknown;
  onChange?: (json: unknown, meta: FakeRichTextChangeMeta) => void;
}

// What each mounted fake was seeded with, in mount order: recorded once per
// instance, as a `key` change remounts the real editor rather than updating it.
let mountedValues: unknown[] = [];

export function __getMountedValues(): unknown[] {
  return mountedValues;
}

// Every instance still mounted, in mount order. One form can mount several
// editors at once (one per language), so a spec reaches one by position.
const liveEditors = new Set<{ props: FakeRichTextEditorProps }>();

/** The props of every mounted instance, in mount order, as of each one's latest render. */
export function __getEditorProps(): FakeRichTextEditorProps[] {
  return [...liveEditors].map((entry) => entry.props);
}

export function __resetMountedValues(): void {
  mountedValues = [];
}

/**
 * The document the real editor reports once it has opened a stored one: parsing
 * fills `textAlign: null`, and TableOfContents stamps an id on every heading
 * (`rich-text-editor.spec.tsx` pins both). A counter stands in for its uuid.
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
    next.attrs = {
      ...(next.attrs as Record<string, unknown>),
      id,
      'data-toc-id': id,
    };
  }
  if (Array.isArray(node.content)) {
    next.content = node.content.map(normalizeLikeTiptap);
  }

  return next;
}

function FakeRichTextEditor(props: FakeRichTextEditorProps) {
  // Registered once per mount, removed on unmount; `props` tracks each render.
  const [entry] = React.useState(() => {
    const created = { props };
    liveEditors.add(created);
    return created;
  });
  entry.props = props;
  React.useEffect(() => () => void liveEditors.delete(entry), [entry]);

  const recordedRef = React.useRef(false);
  // The document THIS instance opened with, normalised.
  const openedWithRef = React.useRef<unknown>(undefined);

  if (!recordedRef.current) {
    recordedRef.current = true;
    // The RAW `value`: what specs assert the editor was mounted with.
    mountedValues.push(props.value);
    openedWithRef.current = normalizeLikeTiptap(props.value);
  }

  // The real editor reports that document while it opens, with `initial: true`
  // (Tiptap's `create` fires on a timeout and the ToC `onCreate` rewrites the
  // document inside it); a consumer that ignores the flag would autosave on open.
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
        __getEditorProps,
        __resetMountedValues,
      },
      loader: 'object',
    }));
  },
});
