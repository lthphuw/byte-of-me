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
 * The outline, rebuilt after the author pauses instead of inside the keystroke.
 *
 * The extension rebuilds from `onTransaction`, synchronously, with two
 * `doc.descendants` walks and a per-heading `domAtPos(...).offsetTop` read: a
 * forced layout of the whole document, measured at ~280ms on a 350KB note and
 * asked for roughly 150 times per character typed. So `onTransaction` is
 * emptied and the rebuild is driven from a debounce, through the command the
 * extension already exposes for it.
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
 * The document's headings. Disabled, it registers nothing and `scheduleRebuild`
 * does nothing, because the rebuild command exists only with the extension.
 *
 * `headingsChanged` is how the active-heading observer learns that the heading
 * elements are not the ones it was watching: the list can stay equal while
 * ProseMirror replaces the DOM node (a text-align change), so the observer must
 * re-point on every rebuild, not when the list changes.
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
 * The id of the heading the reader is under, or null above the first.
 *
 * The extension works this out in a scroll listener on its `scrollParent`,
 * which here would be the window, and nothing scrolls the window: the column
 * does. Pointing it at the column would hand back the per-scroll document walk
 * that `DebouncedTableOfContents` removes, so an IntersectionObserver answers
 * instead, calling back once per heading crossed. It watches the region ABOVE
 * the column's top edge, so "intersecting" means "this heading has scrolled
 * past the top", and the active one is the last that has. A thin band would
 * look equivalent and is not: one fast flick jumps a heading over it with no
 * callback either side.
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
