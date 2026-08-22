'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** One arrow-key nudge, in pixels. Coarse enough to be worth a keypress. */
export const RESIZE_KEYBOARD_STEP = 16;

export interface UseResizablePanelParams {
  /** localStorage key holding this panel's `{ width, collapsed }`. */
  storageKey: string;
  /** Narrowest usable width, in pixels. */
  min: number;
  /** Widest allowed width, in pixels. */
  max: number;
  /** Width before the user has ever dragged, and the double-click reset target. */
  defaultWidth: number;
  /**
   * Which edge of the layout the panel is anchored to.
   *
   * `'start'` (the default) is a left panel: dragging its separator right
   * makes it wider. `'end'` is a right panel, where the same gesture makes it
   * NARROWER — the separator is on its other side. Without this the viewer
   * pane grew when you pushed the handle into it, which reads as the panel
   * fighting the pointer.
   */
  edge?: 'start' | 'end';
  /**
   * The CSS custom property the pane's width is delivered through — e.g.
   * `--notes-sidebar-w`, read back by a `w-[var(--notes-sidebar-w)]` class.
   *
   * Naming it here is what lets a drag skip React entirely: set this, attach
   * `panelRef` to the element the property lives on, and `pointermove` writes
   * the width onto that element instead of re-rendering the caller. See
   * `writeLive`.
   *
   * Optional, because the hook is usable without it — but a caller that omits
   * it gets a pane that only redraws when the gesture ENDS, since nothing
   * re-renders in between.
   */
  cssVar?: string;
}

/**
 * Everything the separator element needs, ready to spread onto a `<div>`:
 * the ARIA slider contract, the drag handlers, keyboard resizing, and the
 * double-click reset.
 */
export interface ResizeSeparatorProps {
  role: 'separator';
  'aria-orientation': 'vertical';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  /** Reachable by keyboard: the separator is an operable control, not decoration. */
  tabIndex: 0;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}

export interface ResizablePanel {
  /**
   * The panel's width in pixels, always inside `[min, max]`. It keeps its
   * value while collapsed — collapsing is a separate flag, so expanding
   * returns to the width the user last chose rather than to `defaultWidth`.
   *
   * Always the CURRENT width, including mid-drag, where React state is
   * deliberately one gesture behind — it is a getter over the mirror rather
   * than a snapshot. See the return statement for why that matters.
   */
  width: number;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  /**
   * Attach to the element `cssVar` is set on — the pane itself, not the
   * separator. Without it a drag has nowhere to paint and only lands on
   * `pointerup`.
   */
  panelRef: RefObject<HTMLElement | null>;
  separatorProps: ResizeSeparatorProps;
}

interface PanelState {
  width: number;
  collapsed: boolean;
}

interface DragState {
  pointerId: number;
  /** Pointer position when the drag started. */
  startX: number;
  /** Panel width when the drag started; every move is measured against it. */
  startWidth: number;
}

/**
 * A VS Code-style resizable, collapsible side panel: drag the separator,
 * nudge it with the arrow keys, double-click to reset, and keep the size per
 * browser.
 *
 * The drag deliberately uses `setPointerCapture` on the separator with the
 * `pointermove`/`pointerup` handlers on that *same* element, rather than the
 * usual pair of `window` listeners added on pointerdown. Capture redirects
 * every subsequent event of that pointer to the separator even while the
 * cursor is over an iframe or off the window, so the window listeners buy
 * nothing — and they are the thing that leaks when the component unmounts
 * mid-drag. Here there is nothing to leak: the handlers are React props and
 * disappear with the element.
 *
 * The drag also does not go through React state: `pointermove` fires at the
 * pointer's rate, and the notes workspace renders the note editor from the
 * same component that owns the width — one style+layout pass over a
 * 3,797-node research note measures ~280ms, so a `setState` per frame was a
 * splitter that visibly lagged the cursor while the editor re-laid itself out
 * underneath. `writeLive` paints the pane directly and `endDrag` commits once.
 */
export function useResizablePanel({
  storageKey,
  min,
  max,
  defaultWidth,
  edge = 'start',
  cssVar,
}: UseResizablePanelParams): ResizablePanel {
  // +1 for a left panel, -1 for a right one. Applied to the pointer delta and
  // to the arrow keys alike, so "left arrow narrows what is on the left and
  // widens what is on the right" — the direction the eye expects in both.
  const direction = edge === 'end' ? -1 : 1;
  const clampWidth = useCallback(
    (value: number) => Math.min(Math.max(value, min), max),
    [min, max]
  );

  const [state, setState] = useState<PanelState>(() => ({
    width: Math.min(Math.max(defaultWidth, min), max),
    collapsed: false,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  // Mirrors `state` so a handler can read the current width without being
  // re-created on every pixel of a drag, and so two updates inside one event
  // still compose. It is also the ONLY record of the width while a drag is in
  // flight — `writeLive` advances it without a render, so between pointerdown
  // and pointerup `state` holds where the gesture started and this holds where
  // the pointer is.
  const stateRef = useRef(state);
  // Guarded, because a render CAN happen mid-drag — anything above this hook
  // re-rendering for its own reasons — and copying the committed state back
  // over the mirror there would throw the gesture so far away: the pane would
  // snap to where the drag started for that frame, and `endDrag` would then
  // commit that same stale width.
  if (!drag.current) stateRef.current = state;

  const persist = useCallback(
    (next: PanelState) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Quota exceeded, or a privacy mode that throws on write. The size
        // still applies for this session; persistence is best-effort.
      }
    },
    [storageKey]
  );

  /**
   * The committing write path, so the clamp cannot be bypassed: the stored
   * width arriving, the arrow keys, the double-click reset, collapsing, and
   * the single write that ends a drag. Everything here renders.
   *
   * `save` is false only for the width read back OUT of storage, which has
   * nothing to write back. A drag still persists nothing until `pointerup` —
   * a `localStorage` write per `pointermove` is a synchronous disk write per
   * frame — but it no longer comes through here at all; see `writeLive`.
   */
  const write = useCallback(
    (next: Partial<PanelState>, save: boolean) => {
      const merged: PanelState = {
        width: clampWidth(next.width ?? stateRef.current.width),
        collapsed: next.collapsed ?? stateRef.current.collapsed,
      };
      stateRef.current = merged;
      setState(merged);
      if (save) persist(merged);
    },
    [clampWidth, persist]
  );

  /**
   * The mid-drag write path: mirror, DOM, done — deliberately no `setState`.
   *
   * The width is ALREADY delivered to the layout as a custom property, so
   * during a gesture it is set on the pane directly and React is left out of
   * the loop entirely. That is what removes the per-frame re-render of the
   * caller's subtree; `endDrag` commits the final value once.
   *
   * `aria-valuenow` is written the same way rather than left to that commit: a
   * slider that only reports its value after the gesture has ended is one a
   * screen reader cannot follow while it moves. The next render agrees with
   * both, because it reads the same mirror.
   */
  const writeLive = useCallback(
    (width: number, separator: HTMLElement) => {
      const merged: PanelState = {
        width: clampWidth(width),
        collapsed: stateRef.current.collapsed,
      };
      stateRef.current = merged;

      if (cssVar) {
        panelRef.current?.style.setProperty(cssVar, `${merged.width}px`);
      }
      separator.setAttribute('aria-valuenow', String(merged.width));
    },
    [clampWidth, cssVar]
  );

  // Read in an effect, not at init: the first render must match the server
  // HTML (localStorage does not exist there), so the panel opens at
  // `defaultWidth` for one frame and then snaps to the saved width — a flash
  // the alternative (a hydration mismatch) is strictly worse than.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const stored = parsed as Record<string, unknown>;
      write(
        {
          // A stored width goes through the same clamp as a dragged one: the
          // value may predate a change to `min`/`max`, or have been edited by
          // hand into something that would render the panel unusable.
          width:
            typeof stored.width === 'number' && Number.isFinite(stored.width)
              ? stored.width
              : undefined,
          collapsed:
            typeof stored.collapsed === 'boolean'
              ? stored.collapsed
              : undefined,
        },
        false
      );
    } catch {
      // Corrupt storage falls back to the defaults; never crash the panel.
    }
  }, [storageKey, write]);

  // Suppresses the text selection a drag across the page would otherwise
  // make. Cleanup rather than the pointerup handler alone, so unmounting
  // mid-drag cannot leave the whole document unselectable.
  useEffect(() => {
    if (!isDragging) return;

    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.userSelect = previous;
    };
  }, [isDragging]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Primary button only; a right-click opens a context menu instead.
      if (event.button !== 0) return;

      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: stateRef.current.width,
      };
      setIsDragging(true);

      // jsdom implements no pointer capture at all (happy-dom, which this
      // repo's specs run on, does), and neither do older mobile browsers —
      // feature-detect so a missing implementation degrades to a drag that
      // works while the pointer stays over the separator, instead of throwing
      // on pointerdown and leaving the panel unresizable.
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    []
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;

      writeLive(
        current.startWidth + direction * (event.clientX - current.startX),
        event.currentTarget
      );
    },
    [writeLive, direction]
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;

      drag.current = null;
      setIsDragging(false);

      const target = event.currentTarget;
      if (
        typeof target.releasePointerCapture === 'function' &&
        typeof target.hasPointerCapture === 'function' &&
        target.hasPointerCapture(event.pointerId)
      ) {
        target.releasePointerCapture(event.pointerId);
      }

      // The gesture's only render and its only disk write, from the width
      // `writeLive` has been keeping in the mirror.
      write({}, true);
    },
    [write]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      let next: number;
      switch (event.key) {
        case 'ArrowLeft':
          next = stateRef.current.width - direction * RESIZE_KEYBOARD_STEP;
          break;
        case 'ArrowRight':
          next = stateRef.current.width + direction * RESIZE_KEYBOARD_STEP;
          break;
        case 'Home':
          next = min;
          break;
        case 'End':
          next = max;
          break;
        default:
          // Everything else — Tab, Escape, a shortcut — belongs to the page.
          return;
      }

      event.preventDefault();
      write({ width: next }, true);
    },
    [write, min, max, direction]
  );

  const onDoubleClick = useCallback(() => {
    write({ width: defaultWidth }, true);
  }, [write, defaultWidth]);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      write({ collapsed }, true);
    },
    [write]
  );

  return {
    // A getter over the mirror rather than `state.width`, because a drag
    // leaves the state one gesture behind on purpose. A caller that re-renders
    // mid-drag for an unrelated reason — a query resolving, a sibling's state
    // moving — would otherwise paint the width the gesture STARTED at back
    // over the one already on the element, snapping the pane for that frame
    // and then jumping again on release. The mirror is the freshest answer at
    // every point in the gesture, and it is what the element already shows.
    get width() {
      return stateRef.current.width;
    },
    isCollapsed: state.collapsed,
    setCollapsed,
    panelRef,
    separatorProps: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-valuenow': stateRef.current.width,
      'aria-valuemin': min,
      'aria-valuemax': max,
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick,
    },
  };
}
