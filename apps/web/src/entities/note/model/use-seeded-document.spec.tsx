import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { type SeededDocument, useSeededDocument } from './use-seeded-document';

/**
 * Renders the hook for real rather than calling it directly: the whole point
 * of `generation` is that it survives across commits, and a value read from
 * one render says nothing about that.
 */
function setup(initialContent?: string) {
  const seen: SeededDocument[] = [];

  function Probe() {
    seen.push(useSeededDocument(initialContent));
    return null;
  }

  render(<Probe />);
  return {
    seen,
    latest: () => seen[seen.length - 1]!,
    reseed: (content: string) =>
      act(() => seen[seen.length - 1]!.reseed(content)),
  };
}

const DOCUMENT = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
});

afterEach(cleanup);

describe('useSeededDocument', () => {
  it('parses the initial content once, before the first render', () => {
    const { latest } = setup(DOCUMENT);

    expect(latest().value).toEqual(JSON.parse(DOCUMENT));
    expect(latest().generation).toBe(0);
  });

  it('starts empty when seeded from nothing, the way the owner editor does', () => {
    const { latest } = setup();

    expect(latest().value).toBe('');
  });

  it('hands legacy plain text to the editor rather than losing it', () => {
    const { latest } = setup('written before the editor existed');

    expect(latest().value).toBe('written before the editor existed');
  });

  // The invariant this hook exists for. Five call sites used to open-code the
  // pair, and either half alone is a bug the author sees: a generation without
  // a value remounts the editor onto the PREVIOUS document, and a value
  // without a generation changes a prop Tiptap has already read for the last
  // time.
  it('moves the document and the generation together, every time', () => {
    const { latest, reseed } = setup(DOCUMENT);
    const before = latest();

    reseed('second');

    expect(latest().value).toBe('second');
    expect(latest().generation).toBe(before.generation + 1);
  });

  it('advances the generation even when reseeded with the same document', () => {
    const { latest, reseed } = setup(DOCUMENT);

    reseed(DOCUMENT);
    const once = latest().generation;
    reseed(DOCUMENT);

    // Not deduplicated on purpose: `take-server` reseeds with a document the
    // editor may already agree with, and it still has to be remounted for the
    // reader's own unsent edit to be discarded.
    expect(once).toBe(1);
    expect(latest().generation).toBe(2);
  });

  it('keeps `reseed` stable, so callers may depend on it without re-arming', () => {
    const { seen, reseed } = setup(DOCUMENT);
    const first = seen[0]!.reseed;

    reseed('second');

    expect(seen[seen.length - 1]!.reseed).toBe(first);
  });
});
