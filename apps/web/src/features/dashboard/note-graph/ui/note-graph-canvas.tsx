'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { Crosshair } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type NoteGraph, noteHref } from '@/entities/note';
import {
  clampScale,
  fitViewport,
  hitTest,
  neighbourIds,
  nodeRadius,
  type PositionedNode,
  screenToWorld,
  shouldDrawLabels,
  type Viewport,
  worldToScreen,
} from '@/features/dashboard/note-graph/lib/graph-model';
import { useGraphSimulation } from '@/features/dashboard/note-graph/lib/use-graph-simulation';

/** Screen px a pointer must travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;

/**
 * How long the view takes to travel back to the fitted framing.
 *
 * Long enough to be followed — the point of animating a reset at all is that
 * the author can see WHERE they were relative to where they now are, which a
 * jump cut throws away — and short enough not to be a wait.
 */
const RESET_DURATION_MS = 320;

/** Screen px the keyboard cursor keeps between its node and the canvas edge. */
const CURSOR_MARGIN = 56;

/** Arrow key → the direction it travels in, in world units (y grows downward). */
const ARROW_STEPS: Record<string, readonly [number, number] | undefined> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

interface FitOptions {
  /** Reframe even if the one-shot auto-fit has already run. */
  force?: boolean;
  /** Travel to the new framing rather than cutting to it. */
  animate?: boolean;
}

/**
 * Checked at the moment of the gesture rather than through a hook, because
 * that is when the answer matters and the setting can change mid-session.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface NoteGraphCanvasProps {
  graph: NoteGraph;
  onOpen: (noteId: string) => void;
}

/**
 * The graph itself: a hand-drawn canvas, not SVG.
 *
 * SVG would mean one DOM node per note plus one per link, all of them touched
 * on every simulation tick — the workload browsers handle worst. Canvas draws
 * the same frame in a single pass and stays flat as the corpus grows.
 *
 * Colours come from the page's own CSS custom properties, so the graph follows
 * the theme with no second palette to keep in sync. The highlight is
 * `--chart-1` rather than `--primary` for a specific reason: this theme is
 * monochrome, and in dark mode `--primary` and `--foreground` are the SAME
 * value (`0 0% 98%`) — a hover highlight painted in primary would be
 * literally invisible. The chart tokens are the only ones in the palette that
 * carry hue in both themes, which is exactly what they exist for.
 */
export function NoteGraphCanvas({ graph, onOpen }: NoteGraphCanvasProps) {
  const t = useTranslations('dashboard.note.graph');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 });
  const hoverRef = useRef<PositionedNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => {});

  // Pointer bookkeeping, all in a ref: none of it should cause a render.
  const pointerRef = useRef({
    id: null as number | null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    node: null as PositionedNode | null,
    moved: false,
    /** Every additional active pointer, for pinch. */
    others: new Map<number, { x: number; y: number }>(),
    pinchDistance: null as number | null,
  });

  // The single piece of interaction state React does own: the hovered title,
  // rendered as real DOM so it is selectable and reaches assistive tech —
  // text painted into a canvas reaches neither.
  const [hoverTitle, setHoverTitle] = useState<string | null>(null);

  /**
   * The KEYBOARD cursor — a second, independent pointer into the graph.
   *
   * Kept apart from `hoverRef` rather than folded into it: hover is a pointer
   * position that must not survive the pointer leaving, and this one has to
   * survive everything except Escape. It is React state (not a ref like the
   * rest of the interaction bookkeeping) because two pieces of real DOM read
   * it — the title chip and the live region — and canvas pixels reach no
   * assistive technology at all.
   */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const hintId = useId();
  const focusedTitle =
    graph.nodes.find((node) => node.id === focusedId)?.title ?? null;

  const requestDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      drawRef.current();
    });
  }, []);

  // Same indirection as `drawRef` below, and for the same reason: the
  // simulation hook needs a stable callback, but the body of that callback
  // needs `nodesRef`, which the hook itself returns. The ref breaks the cycle
  // without a forward reference into a `const` that has not initialised yet.
  const hasFittedRef = useRef(false);
  const fitRef = useRef<(options?: FitOptions) => void>(() => {});
  const onSettle = useCallback(() => fitRef.current(), []);

  // The reset animation's own frame handle, kept apart from `frameRef`: that
  // one coalesces paint requests and is cleared by the frame it booked, while
  // this one is a loop that has to survive across frames to be cancellable.
  // Sharing a single handle would have each cancel the other.
  const tweenRef = useRef<number | null>(null);
  const cancelTween = useCallback(() => {
    if (tweenRef.current !== null) cancelAnimationFrame(tweenRef.current);
    tweenRef.current = null;
  }, []);

  const { nodesRef, setDragged, reheat } = useGraphSimulation(
    graph,
    requestDraw,
    onSettle
  );

  // Frames the graph in the canvas. `force` bypasses the once-per-graph gate
  // that keeps a later settle — after a drag, say — from yanking the view
  // away from wherever the author has panned it.
  fitRef.current = ({ force = false, animate = false } = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (hasFittedRef.current && !force) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const target = fitViewport(nodesRef.current, width, height);
    hasFittedRef.current = true;
    cancelTween();

    // The automatic first fit asks for no animation, and should not: there is
    // nothing to travel FROM but the arbitrary pre-settle framing, which was
    // never meant to be looked at. Only a reset the author asked for animates.
    if (!animate || prefersReducedMotion()) {
      viewportRef.current = target;
      requestDraw();
      return;
    }

    const from = { ...viewportRef.current };
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / RESET_DURATION_MS);
      // easeOutCubic: leaves quickly, arrives gently. A linear tween on a
      // pan reads as the canvas being dragged by something else.
      const eased = 1 - (1 - progress) ** 3;
      viewportRef.current = {
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        scale: from.scale + (target.scale - from.scale) * eased,
      };
      requestDraw();
      tweenRef.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    tweenRef.current = requestAnimationFrame(step);
  };

  // Reassigned every render so the closure always sees the current `graph`.
  // The rAF callback above goes through the ref rather than capturing a draw
  // function directly, which is what keeps `requestDraw` stable enough to
  // hand to the simulation hook without rebuilding it.
  drawRef.current = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    // The backing store is sized in device pixels and the drawing transform
    // scaled to match; without this the whole graph is soft on any retina
    // display.
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    // shadcn stores raw `H S% L%` triples, not finished colours, so they need
    // wrapping before canvas will take them.
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const foreground = token('--foreground');
    const background = token('--background');
    const accent = token('--chart-1');
    const muted = token('--muted-foreground');
    const hsl = (triple: string, alpha: number) => `hsl(${triple} / ${alpha})`;

    const viewport = viewportRef.current;
    const nodes = nodesRef.current;
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const hovered = hoverRef.current;
    const highlighted = hovered ? neighbourIds(graph.edges, hovered.id) : null;

    // Edges first, so nodes paint over them.
    context.lineWidth = 1;
    for (const edge of graph.edges) {
      const from = byId.get(edge.source);
      const to = byId.get(edge.target);
      if (!from || !to) continue;
      const lit =
        hovered !== null &&
        (edge.source === hovered.id || edge.target === hovered.id);
      context.strokeStyle = lit ? hsl(accent, 0.9) : hsl(muted, 0.25);
      context.lineWidth = lit ? 1.6 : 1;
      const a = worldToScreen(from, viewport);
      const b = worldToScreen(to, viewport);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    const withLabels = shouldDrawLabels(viewport, nodes.length);
    context.font =
      '12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';

    for (const node of nodes) {
      const at = worldToScreen(node, viewport);
      const radius = nodeRadius(node.degree) * viewport.scale;

      // Cull offscreen nodes. On a large graph most of them are, and the
      // cheapest draw call is the one that never happens.
      const margin = radius + 80;
      if (
        at.x < -margin ||
        at.y < -margin ||
        at.x > width + margin ||
        at.y > height + margin
      ) {
        continue;
      }

      const isHovered = node.id === hovered?.id;
      const dimmed =
        highlighted !== null && !isHovered && !highlighted.has(node.id);
      // An unlinked note is drawn dimmer — never smaller, never hidden. The
      // spec's whole reason for plotting orphans (§6.6) is that they are the
      // ones worth noticing.
      const isOrphan = node.degree === 0;
      const alpha = dimmed ? 0.18 : isOrphan ? 0.45 : 0.95;

      context.fillStyle = isHovered
        ? hsl(accent, 1)
        : highlighted?.has(node.id)
          ? hsl(accent, 0.75)
          : hsl(foreground, alpha);
      context.beginPath();
      context.arc(at.x, at.y, radius, 0, Math.PI * 2);
      context.fill();

      // The keyboard cursor, drawn as a ring rather than a fill so it reads as
      // "here" on top of whatever the node already says about itself.
      if (node.id === focusedId) {
        context.lineWidth = 2;
        context.strokeStyle = hsl(accent, 1);
        context.beginPath();
        context.arc(at.x, at.y, radius + 4, 0, Math.PI * 2);
        context.stroke();
      }

      if (withLabels && !dimmed) {
        const label =
          node.title.length > 28 ? `${node.title.slice(0, 27)}…` : node.title;
        const labelY = at.y + radius + 3;
        // A halo in the page background colour, stroked behind the glyphs.
        // A force layout puts neighbours close together, so two labels WILL
        // overlap in a cluster; without this they interleave into an
        // unreadable smear. It also lifts the text off the edges it crosses.
        context.lineWidth = 3;
        context.lineJoin = 'round';
        context.strokeStyle = hsl(background, 0.85);
        context.strokeText(label, at.x, labelY);
        context.fillStyle = hsl(foreground, isHovered ? 0.95 : 0.7);
        context.fillText(label, at.x, labelY);
      }
    }
  };

  // A new graph starts centred on the origin — the simulation lays out around
  // it — and re-arms the one-shot auto-fit that runs when the layout settles.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    hasFittedRef.current = false;
    setFocusedId(null);
    viewportRef.current = {
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      scale: 1,
    };
    requestDraw();
  }, [graph, requestDraw]);

  // The cursor moved, so the ring has to. An effect rather than a `requestDraw`
  // inside the key handler: `drawRef.current` is reassigned during render, and
  // only by the time effects run is the closure the one that knows where the
  // cursor now is.
  useEffect(() => {
    requestDraw();
  }, [focusedId, requestDraw]);

  // The canvas is CSS-sized, so nothing else tells us the backing store and
  // the centre offset are now wrong.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => requestDraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [requestDraw]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // Clearing the handle is the whole point of this line, and leaving it
      // out cost the graph every one of its pixels.
      //
      // `frameRef` is the coalescing guard for `requestDraw`: non-null means
      // "a frame is already booked, do nothing". Cancelling the frame without
      // resetting it leaves the guard latched shut against a frame that will
      // now never arrive to unlatch it — every later `requestDraw` returns
      // immediately and the canvas is never painted again.
      //
      // Unmounting normally would make that harmless, since a remount brings
      // fresh refs. StrictMode is the case that bites: React runs the effects,
      // tears them down and runs them again on the SAME fiber, so the refs
      // survive. In dev the graph therefore mounted, booked a frame, cancelled
      // it, and rendered an empty canvas — 55 notes counted in the corner and
      // nothing drawn — with its backing store still at the 300x150 default,
      // proving `draw` had not run even once.
      frameRef.current = null;
      cancelTween();
    },
    [cancelTween]
  );

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const zoomAt = (centre: { x: number; y: number }, factor: number) => {
    const viewport = viewportRef.current;
    const nextScale = clampScale(viewport.scale * factor);
    // Solve for the offset that holds the world point under the cursor still.
    // This is the whole difference between zooming *at the pointer* and
    // zooming at the origin, which feels broken.
    const world = screenToWorld(centre, viewport);
    viewportRef.current = {
      scale: nextScale,
      x: centre.x - world.x * nextScale,
      y: centre.y - world.y * nextScale,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    const pointer = pointerRef.current;
    // Touching the canvas ends the reset animation. A tween that kept writing
    // the viewport underneath a pan would drag the graph away from the finger
    // holding it.
    cancelTween();

    if (pointer.id !== null) {
      // A second finger: this becomes a pinch, and whatever the first finger
      // was doing is abandoned rather than fought with.
      pointer.others.set(event.pointerId, point);
      pointer.pinchDistance = null;
      pointer.node = null;
      setDragged(null);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.id = event.pointerId;
    pointer.startX = point.x;
    pointer.startY = point.y;
    pointer.lastX = point.x;
    pointer.lastY = point.y;
    pointer.moved = false;
    pointer.node = hitTest(nodesRef.current, point, viewportRef.current);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    const pointer = pointerRef.current;

    if (pointer.others.size > 0 && pointer.id !== null) {
      if (pointer.others.has(event.pointerId)) {
        pointer.others.set(event.pointerId, point);
      } else {
        pointer.lastX = point.x;
        pointer.lastY = point.y;
      }
      const other = [...pointer.others.values()][0];
      if (!other) return;
      const distance = Math.hypot(
        other.x - pointer.lastX,
        other.y - pointer.lastY
      );
      if (pointer.pinchDistance !== null && pointer.pinchDistance > 0) {
        zoomAt(
          {
            x: (other.x + pointer.lastX) / 2,
            y: (other.y + pointer.lastY) / 2,
          },
          distance / pointer.pinchDistance
        );
      }
      pointer.pinchDistance = distance;
      requestDraw();
      return;
    }

    if (pointer.id === null) {
      // Nothing held: hover highlighting.
      const hit = hitTest(nodesRef.current, point, viewportRef.current);
      if (hit?.id !== hoverRef.current?.id) {
        hoverRef.current = hit;
        setHoverTitle(hit?.title ?? null);
        requestDraw();
      }
      return;
    }

    const dx = point.x - pointer.lastX;
    const dy = point.y - pointer.lastY;
    pointer.lastX = point.x;
    pointer.lastY = point.y;

    if (
      !pointer.moved &&
      Math.hypot(point.x - pointer.startX, point.y - pointer.startY) >
        DRAG_THRESHOLD
    ) {
      pointer.moved = true;
    }
    if (!pointer.moved) return;

    if (pointer.node) {
      setDragged(pointer.node.id, screenToWorld(point, viewportRef.current));
    } else {
      viewportRef.current = {
        ...viewportRef.current,
        x: viewportRef.current.x + dx,
        y: viewportRef.current.y + dy,
      };
    }
    requestDraw();
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current;
    pointer.others.delete(event.pointerId);
    if (pointer.id !== event.pointerId) return;

    // A press that never moved is a click. A drag that happens to end on a
    // node is not — opening a note the author was only repositioning is the
    // single most annoying thing a graph like this can do.
    if (pointer.node && !pointer.moved) onOpen(pointer.node.id);

    setDragged(null);
    pointer.id = null;
    pointer.node = null;
    pointer.pinchDistance = null;
    // The PRIMARY pointer ending ends the whole gesture, so any secondary
    // still on the books is stale. Leaving them was a one-way trip: `others`
    // is what the move handler checks to decide it is mid-pinch, so a single
    // leftover entry routed every subsequent one-finger drag into the pinch
    // branch and panning never worked again for the life of the page.
    //
    // Easy to hit for real, not just in a test: lift the two fingers close
    // enough together and the primary's `pointerup` arrives first, or the
    // browser sends `pointercancel` for one of them and nothing else.
    pointer.others.clear();
    requestDraw();
  };

  /** Pans just far enough to bring a node the cursor jumped to into view. */
  const revealNode = (node: PositionedNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const at = worldToScreen(node, viewportRef.current);
    if (
      at.x >= CURSOR_MARGIN &&
      at.y >= CURSOR_MARGIN &&
      at.x <= width - CURSOR_MARGIN &&
      at.y <= height - CURSOR_MARGIN
    ) {
      return;
    }
    // Same reason a pointer press cancels it: a tween still writing the
    // viewport would drag the graph out from under the cursor.
    cancelTween();
    viewportRef.current = {
      ...viewportRef.current,
      x: viewportRef.current.x + (width / 2 - at.x),
      y: viewportRef.current.y + (height / 2 - at.y),
    };
  };

  /**
   * Moves the cursor to the nearest node in the direction pressed.
   *
   * Geometric rather than list order, because the thing on screen is a map:
   * "the note to the right of this one" is the only reading of Right that
   * matches what the author can see. Candidates are restricted to a 90° cone
   * (`across <= along`) and then scored so that travelling sideways costs
   * double — without that a node barely inside the cone but very close wins
   * over the one the author was obviously pointing at.
   */
  const moveFocus = (dx: number, dy: number) => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    const current = nodes.find((node) => node.id === focusedId) ?? null;
    if (!current) {
      // No cursor yet: start from whatever is nearest the middle of the view,
      // which is where the eye already is.
      const canvas = canvasRef.current;
      const centre = {
        x: (canvas?.clientWidth ?? 0) / 2,
        y: (canvas?.clientHeight ?? 0) / 2,
      };
      let nearest: PositionedNode | null = null;
      let nearestDistance = Infinity;
      for (const node of nodes) {
        const at = worldToScreen(node, viewportRef.current);
        const distance = Math.hypot(at.x - centre.x, at.y - centre.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = node;
        }
      }
      if (!nearest) return;
      revealNode(nearest);
      setFocusedId(nearest.id);
      return;
    }

    let best: PositionedNode | null = null;
    let bestScore = Infinity;
    for (const node of nodes) {
      if (node.id === current.id) continue;
      const ox = node.x - current.x;
      const oy = node.y - current.y;
      const along = ox * dx + oy * dy;
      if (along <= 0) continue;
      const across = Math.abs(ox * dy - oy * dx);
      if (across > along) continue;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }

    if (!best) return;
    revealNode(best);
    setFocusedId(best.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = ARROW_STEPS[event.key];
    if (step) {
      // The canvas fills a scrolling pane; without this the arrow keys scroll
      // it instead of moving the cursor.
      event.preventDefault();
      moveFocus(step[0], step[1]);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedId) return;
      event.preventDefault();
      onOpen(focusedId);
      return;
    }

    // Releases the cursor without leaving the canvas, so the arrow keys go
    // back to the page and Tab still resumes from here.
    if (event.key === 'Escape') setFocusedId(null);
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    cancelTween();
    // Exponential, so a zoom out and the matching zoom in cancel exactly.
    zoomAt(localPoint(event), Math.exp(-event.deltaY * 0.0015));
    requestDraw();
  };

  return (
    <div className="relative size-full">
      <canvas
        ref={canvasRef}
        // Focusable, named, and told to pass keystrokes through. Without these
        // the whole page was mouse-only: a canvas is one opaque element with
        // no accessible name and nothing inside it to reach.
        //
        // `role="application"` rather than `img`, because this element is an
        // interactive widget with its own key bindings — a screen reader has
        // to stop intercepting the arrow keys for the cursor below to exist.
        // The list further down is what browse mode navigates instead.
        tabIndex={0}
        role="application"
        aria-label={t('canvasLabel')}
        aria-describedby={hintId}
        // `touch-none` hands every touch gesture to the handlers above.
        // Without it the browser claims them for scrolling and pan/pinch
        // never fire at all.
        className="size-full touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onKeyDown={onKeyDown}
        // Leaving takes the cursor with it: a ring painted while the canvas is
        // not focused claims a position the arrow keys no longer move.
        onBlur={() => setFocusedId(null)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        // "Tidy up": re-settle the layout AND reframe it. Two halves of one
        // gesture — reheating without refitting just shuffles the graph
        // around inside a viewport the author may have panned away from.
        onDoubleClick={() => {
          reheat();
          fitRef.current({ force: true, animate: true });
        }}
      />

      {/* The way back. A graph is trivially easy to get lost in — a few wheel
          notches past the last node and the screen is empty with nothing on it
          to steer by, which is a dead end rather than a state you can undo.
          The double-click gesture already reframed, but a gesture nobody is
          told about rescues nobody, so the same thing is a visible control.
          It reframes only: re-running the layout as well would answer "put it
          back" by moving every node somewhere new.

          Bottom-right, in the corner every map application puts its view
          controls. The legend beside it is pushed left by exactly this
          button's width — see `NoteGraph`. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute bottom-3 right-3 size-8 bg-background/80 backdrop-blur"
        onClick={() => fitRef.current({ force: true, animate: true })}
        title={t('resetView')}
      >
        <Crosshair className="size-4" aria-hidden="true" />
        <span className="sr-only">{t('resetView')}</span>
      </Button>

      {/* The keyboard cursor takes precedence over the pointer's: if both are
          somewhere, the one the author is steering is the one being steered. */}
      {(focusedTitle ?? hoverTitle) && (
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] truncate rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm">
          {focusedTitle ?? hoverTitle}
        </p>
      )}

      {/* The text alternative — the whole graph, as something that can be read
          and navigated rather than looked at.
          Announced separately from the chip above: only the KEYBOARD cursor
          belongs in a live region, because a mouse moving across a dense
          cluster would otherwise announce a note per pixel. */}
      <p className="sr-only" role="status" aria-live="polite">
        {focusedTitle}
      </p>
      <div className="sr-only">
        <p id={hintId}>{t('keyboardHint')}</p>
        <p>{t('noteListLabel')}</p>
        <ul>
          {graph.nodes.map((node) => (
            <li key={node.id}>
              {/* A real `href`, the same one a `[[` link stores, so the note
                  has an address here too — the click is still intercepted so
                  the graph page navigates the way every other route does. */}
              <a
                href={noteHref(node.id)}
                onClick={(event) => {
                  event.preventDefault();
                  onOpen(node.id);
                }}
              >
                {node.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
