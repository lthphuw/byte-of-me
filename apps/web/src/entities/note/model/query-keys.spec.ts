/**
 * `noteKeys.lists()` is the set a mutation invalidates when it changes which
 * notes exist, or what a row says about one. This spec exists because the
 * failure mode is invisible: TanStack matches keys by PREFIX, an invalidation
 * that matches nothing is not an error, and the only symptom is a sidebar
 * that quietly stops updating until the page is reloaded.
 *
 * That is not hypothetical. Moving the explorer to per-level `children` reads
 * left every call site invalidating `tree`, which cannot prefix-match
 * `children` — creating a note stopped making it appear. These assertions are
 * the guard for the next key that gets added and forgotten.
 */
import { describe, expect, it } from 'bun:test';

import { noteKeys } from './query-keys';

/** TanStack's own rule: a key matches when the filter is a prefix of it. */
function prefixMatches(filter: readonly unknown[], key: readonly unknown[]) {
  return filter.every((part, index) => Object.is(part, key[index]));
}

/** Every list-shaped key the explorer actually mounts a query with. */
const MOUNTED_LIST_KEYS: Array<[string, readonly unknown[]]> = [
  ['tree root level', noteKeys.children(null, false)],
  ['tree nested level', noteKeys.children('folder-1', false)],
  ['tree level, archived view', noteKeys.children(null, true)],
  ['flat page', noteKeys.page(false, 'updated')],
  ['group summaries', noteKeys.groups('status', false)],
  ['group rows', noteKeys.groupRows('label', 'label:l1', false)],
  ['legacy whole corpus', noteKeys.tree(false)],
  // Not a list the explorer renders, but it belongs to this family: it is
  // the cascade count in a PERMANENT-DELETE confirmation, and the client's
  // global 60s staleTime would otherwise let it understate what a delete
  // destroys after the folder gains a note.
  ['delete cascade count', noteKeys.descendantCount('folder-1')],
];

describe('noteKeys.lists', () => {
  for (const [name, key] of MOUNTED_LIST_KEYS) {
    it(`invalidates the ${name} query`, () => {
      const covered = noteKeys.lists().some((filter) =>
        prefixMatches(filter, key)
      );
      expect(covered).toBe(true);
    });
  }

  it('leaves the open note’s detail alone', () => {
    // `use-note-editor-autosave` documents at length why refetching `detail`
    // around a debounced save reopens a save loop. Sweeping it into this
    // family would reintroduce that, silently.
    const detail = noteKeys.detail('note-1');
    const covered = noteKeys
      .lists()
      .some((filter) => prefixMatches(filter, detail));
    expect(covered).toBe(false);
  });

  it('leaves search results alone', () => {
    // Search has its own invalidation at the one call site that needs it.
    const search = noteKeys.search('query', 1);
    const covered = noteKeys
      .lists()
      .some((filter) => prefixMatches(filter, search));
    expect(covered).toBe(false);
  });
});

describe('noteKeys.children', () => {
  it('separates the root level from a folder that has no children loaded', () => {
    // `null` is a real level, not "unspecified" — the two must never collide.
    expect(noteKeys.children(null, false)).not.toEqual(
      noteKeys.children('folder-1', false) as never
    );
  });

  it('separates the archived view from the live one', () => {
    expect(noteKeys.children(null, false)).not.toEqual(
      noteKeys.children(null, true) as never
    );
  });

  it('is prefix-matched by childrenAll', () => {
    expect(
      prefixMatches(noteKeys.childrenAll(), noteKeys.children('x', true))
    ).toBe(true);
  });
});
