import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import type { NoteOutlineStore } from './note-outline-store';
import { useNoteOutline, useNoteOutlineStore } from './note-outline-store';

/**
 * A report as the editor sends one: a FRESH array of FRESH objects, every
 * time. That is the whole difficulty — the extension fires on every
 * `docChanged` transaction, so typing a character in a paragraph re-reports
 * every heading in the note, and nothing about the identity of what arrives
 * says whether the outline moved.
 */
function report(
  ...headings: Array<[id: string, text: string, isActive?: boolean]>
): OutlineItem[] {
  return headings.map(([id, text, isActive = false], index) => ({
    id,
    level: index === 0 ? 1 : 2,
    text,
    isActive,
  }));
}

function makeStore(): NoteOutlineStore {
  return renderHook(() => useNoteOutlineStore()).result.current;
}

/** Counts how many times the store woke anybody. */
function watch(store: NoteOutlineStore) {
  const woken = { count: 0 };
  store.subscribe(() => {
    woken.count += 1;
  });
  return woken;
}

describe('note outline store', () => {
  // bun:test does not trigger RTL's auto-cleanup.
  afterEach(cleanup);

  it('wakes nobody for a report that says the same thing', () => {
    const store = makeStore();
    const woken = watch(store);

    const first = report(['a', 'Introduction', true], ['b', 'Method']);
    store.set(first);
    expect(woken.count).toBe(1);

    store.set(report(['a', 'Introduction', true], ['b', 'Method']));

    expect(woken.count).toBe(1);
    // Reference-identical, not merely equal: `useNoteOutline` reads this as a
    // `useSyncExternalStore` snapshot, and a new reference nobody was notified
    // about is how that hook ends up re-rendering forever trying to settle.
    expect(store.get()).toBe(first);
  });

  it('wakes exactly once for each kind of change an outline can make', () => {
    const store = makeStore();
    const woken = watch(store);

    store.set(report(['a', 'Introduction', true], ['b', 'Method']));
    expect(woken.count).toBe(1);

    // The reader scrolled: same headings, different one highlighted. Cheap to
    // miss, and missing it leaves the Contents tab pointing at the wrong place.
    store.set(report(['a', 'Introduction'], ['b', 'Method', true]));
    expect(woken.count).toBe(2);

    // A heading was retitled.
    store.set(report(['a', 'Intro'], ['b', 'Method', true]));
    expect(woken.count).toBe(3);

    // And one was deleted.
    store.set(report(['a', 'Intro']));
    expect(woken.count).toBe(4);

    // Clearing on a note switch is a change; clearing again is not.
    store.set([]);
    expect(woken.count).toBe(5);
    store.set([]);
    expect(woken.count).toBe(5);
  });

  it('does not re-render the Contents list for a keystroke that changed no heading', () => {
    const store = makeStore();
    let renders = 0;

    function Contents() {
      renders += 1;
      const outline = useNoteOutline(store);
      return (
        <ul>
          {outline.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      );
    }

    render(<Contents />);
    act(() => store.set(report(['a', 'Introduction', true], ['b', 'Method'])));
    const settled = renders;

    // Three keystrokes in a paragraph, three identical reports. This is the
    // invariant the store exists for: the long research note carries 75
    // headings, and each of these used to re-render all 75 buttons.
    act(() => store.set(report(['a', 'Introduction', true], ['b', 'Method'])));
    act(() => store.set(report(['a', 'Introduction', true], ['b', 'Method'])));
    act(() => store.set(report(['a', 'Introduction', true], ['b', 'Method'])));
    expect(renders).toBe(settled);

    // A real edit still lands.
    act(() => store.set(report(['a', 'Introduction', true], ['b', 'Results'])));
    expect(renders).toBe(settled + 1);
  });
});
