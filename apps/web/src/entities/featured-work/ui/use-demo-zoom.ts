import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useRef,
  useState,
} from 'react';

/** The toolbar steps through these; a pinch moves freely between the two ends. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
/** A pointer that travels further than this is a pan, so the click that ends it is dropped. */
const DRAG_SLOP = 6;
const EPSILON = 0.001;

interface DemoView {
  zoom: number;
  /** Offsets from the centre, in CSS pixels, of the zoomed picture. */
  x: number;
  y: number;
}

const REST: DemoView = { zoom: ZOOM_MIN, x: 0, y: 0 };

/** Pan may not reveal the edge of the zoomed picture, so the box stays covered. */
function clampView(view: DemoView, width: number, height: number): DemoView {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.zoom));
  const maxX = (width * (zoom - ZOOM_MIN)) / 2;
  const maxY = (height * (zoom - ZOOM_MIN)) / 2;
  return {
    zoom,
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  };
}

const nextStep = (zoom: number) =>
  ZOOM_STEPS.find((step) => step > zoom + EPSILON) ?? ZOOM_MAX;
const previousStep = (zoom: number) =>
  [...ZOOM_STEPS].reverse().find((step) => step < zoom - EPSILON) ?? ZOOM_MIN;

/**
 * Zoom and pan for a clip in full screen: toolbar steps, a two-finger pinch, and a
 * one-finger drag while zoomed. `enabled` is true only in full screen; outside it the
 * pointer handlers do nothing, so a page scroll on a phone is untouched.
 */
export function useDemoZoom(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const [view, setView] = useState<DemoView>(REST);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const downAt = useRef({ x: 0, y: 0 });
  const pinch = useRef<{ distance: number; view: DemoView } | null>(null);
  // Set by a drag or pinch; the click that ends one must not toggle playback.
  const moved = useRef(false);

  const boxSize = () => ({
    width: videoRef.current?.clientWidth ?? 0,
    height: videoRef.current?.clientHeight ?? 0,
  });

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    downAt.current = { x: event.clientX, y: event.clientY };
    pinch.current = null;
    moved.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!enabled || !previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);
    const { width, height } = boxSize();

    if (pointers.current.size >= 2) {
      moved.current = true;
      const now = spread();
      if (!pinch.current) pinch.current = { distance: now, view };
      const base = pinch.current;
      if (base.distance > 0 && now > 0) {
        const zoom = base.view.zoom * (now / base.distance);
        setView(clampView({ ...base.view, zoom }, width, height));
      }
      return;
    }

    if (
      Math.hypot(current.x - downAt.current.x, current.y - downAt.current.y) >
      DRAG_SLOP
    )
      moved.current = true;
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    setView((v) =>
      v.zoom > ZOOM_MIN
        ? clampView({ ...v, x: v.x + dx, y: v.y + dy }, width, height)
        : v
    );
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
  };

  const zoomTo = (step: (zoom: number) => number) => {
    const { width, height } = boxSize();
    setView((v) =>
      clampView({ ...v, zoom: step(v.zoom) }, width, height)
    );
  };

  return {
    view,
    zoomIn: () => zoomTo(nextStep),
    zoomOut: () => zoomTo(previousStep),
    resetZoom: () => setView(REST),
    /** True once after a drag or pinch, so the click that followed is ignored. */
    takeMoved: () => {
      const was = moved.current;
      moved.current = false;
      return was;
    },
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
