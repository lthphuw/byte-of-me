'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
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
   */
  width: number;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
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
 */
export function useResizablePanel({
  storageKey,
  min,
  max,
  defaultWidth,
  edge = 'start',
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

  // Mirrors `state` so a handler can read the current width without being
  // re-created on every pixel of a drag, and so two updates inside one event
  // still compose.
  const stateRef = useRef(state);
  stateRef.current = state;

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
   * The single write path, so the clamp cannot be bypassed. `save` is false
   * only while a drag is in flight — writing localStorage on every
   * `pointermove` would be a synchronous disk write per frame.
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
            typeof stored.collapsed === 'boolean' ? stored.collapsed : undefined,
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

      write(
        {
          width:
            current.startWidth + direction * (event.clientX - current.startX),
        },
        false
      );
    },
    [write, direction]
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

      // One write for the whole gesture.
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
    width: state.width,
    isCollapsed: state.collapsed,
    setCollapsed,
    separatorProps: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-valuenow': state.width,
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
