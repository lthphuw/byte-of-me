'use client';

import {
  type MutableRefObject,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AnyExtension } from '@tiptap/core';
import TableOfContents, {
  getHierarchicalIndexes,
  type TableOfContentDataItem,
} from '@tiptap/extension-table-of-contents';
import type { Editor } from '@tiptap/react';

/** One heading, as the outline aside draws it. */
export interface OutlineEntry {
  id: string;
  level: number;
  text: string;
}

/**
 * The outline, rebuilt after a pause instead of per keystroke: the extension's `onTransaction`
 * forces layout of the whole document (~280ms on a 350KB note, ~150 times per character
 * typed), so it is emptied and a debounce drives the extension's own rebuild command.
 */
const DebouncedTableOfContents = TableOfContents.extend({
  onTransaction() {
    return undefined;
  },
});

/** Long enough that a typing burst is one rebuild, short enough to feel attached. */
const OUTLINE_REBUILD_MS = 300;

/**
 * How far above the writing column the "already scrolled past" region reaches.
 * It only has to be impossible to scroll clean past, and `rootMargin` has no
 * keyword for unbounded.
 */
const ABOVE_VIEWPORT_PX = 1_000_000;

const toEntry = (item: TableOfContentDataItem): OutlineEntry => ({
  id: item.id,
  level: item.level ?? 1,
  text: item.textContent,
});

function sameOutline(a: OutlineEntry[], b: OutlineEntry[]) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.id === b[index].id &&
        entry.level === b[index].level &&
        entry.text === b[index].text
    )
  );
}

/**
 * The document's headings; disabled, it registers nothing and `scheduleRebuild` is a no-op.
 * `headingsChanged` re-points the active-heading observer on every rebuild, since the list
 * can stay equal while ProseMirror replaces the DOM node (a text-align change).
 */
export function useOutline(enabled: boolean) {
  const [entries, setEntries] = useState<OutlineEntry[]>([]);
  const headingsChanged = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensions = useMemo<AnyExtension[]>(
    () =>
      enabled
        ? [
            DebouncedTableOfContents.configure({
              getIndex: getHierarchicalIndexes,
              // Its default is `() => window`, a scroll listener that runs a
              // document walk per event while nothing here scrolls the window;
              // the active heading comes from `useActiveHeading` instead.
              scrollParent: undefined,
              onUpdate(content) {
                const next = content.map(toEntry);
                // Same list, same state: a pause that changed no heading must
                // not re-render the host.
                setEntries((prev) => (sameOutline(prev, next) ? prev : next));
                headingsChanged.current?.();
              },
            }),
          ]
        : [],
    [enabled]
  );

  const scheduleRebuild = useCallback(
    (editor: Editor) => {
      if (!enabled) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        // The editor can be torn down between the schedule and the fire.
        if (!editor.isDestroyed) editor.commands.updateTableOfContents();
      }, OUTLINE_REBUILD_MS);
    },
    [enabled]
  );

  // A pending rebuild reaches into `editor.view` when it fires.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { entries, extensions, scheduleRebuild, headingsChanged };
}

/**
 * The id of the heading the reader is under, or null above the first. An IntersectionObserver
 * on the region ABOVE the column's top edge, not the extension's per-scroll document walk;
 * a thin band would miss a heading a fast flick jumps over with no callback either side.
 */
export function useActiveHeading({
  editor,
  scrollRoot,
  headingsChanged,
}: {
  editor: Editor;
  scrollRoot: RefObject<HTMLElement | null>;
  headingsChanged: MutableRefObject<(() => void) | null>;
}): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;

    const surface = editor.view.dom;
    // Document order, so "the last one passed" is a scan back from the end.
    let headings: HTMLElement[] = [];
    const passed = new Set<Element>();

    const publish = () => {
      let active: string | null = null;
      for (let index = headings.length - 1; index >= 0; index -= 1) {
        if (passed.has(headings[index])) {
          active = headings[index].dataset.tocId ?? null;
          break;
        }
      }
      // Null above the first heading: no section is the one being read.
      setActiveId(active);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) passed.add(entry.target);
          else passed.delete(entry.target);
        }
        publish();
      },
      {
        root,
        rootMargin: `${ABOVE_VIEWPORT_PX}px 0px -100% 0px`,
        threshold: 0,
      }
    );

    const observe = () => {
      observer.disconnect();
      // Re-seeded: `observe` delivers an initial callback for every element,
      // and one that left the document must not keep a vote.
      passed.clear();
      headings = [...surface.querySelectorAll<HTMLElement>('[data-toc-id]')];
      for (const heading of headings) observer.observe(heading);
    };

    // Usually finds nothing yet: the ids are stamped by a transaction the
    // extension dispatches from its own `onCreate`, after this effect runs.
    headingsChanged.current = observe;
    observe();

    return () => {
      headingsChanged.current = null;
      observer.disconnect();
    };
  }, [editor, scrollRoot, headingsChanged]);

  return activeId;
}
