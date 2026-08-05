'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteGraph } from '@/entities/note';
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
  const fitRef = useRef<(force?: boolean) => void>(() => {});
  const onSettle = useCallback(() => fitRef.current(), []);

  const { nodesRef, setDragged, reheat } = useGraphSimulation(
    graph,
    requestDraw,
    onSettle
  );

  // Frames the graph in the canvas. `force` bypasses the once-per-graph gate
  // that keeps a later settle — after a drag, say — from yanking the view
  // away from wherever the author has panned it.
  fitRef.current = (force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (hasFittedRef.current && !force) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    viewportRef.current = fitViewport(nodesRef.current, width, height);
    hasFittedRef.current = true;
    requestDraw();
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
    viewportRef.current = {
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      scale: 1,
    };
    requestDraw();
  }, [graph, requestDraw]);

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
    },
    []
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
    requestDraw();
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    // Exponential, so a zoom out and the matching zoom in cancel exactly.
    zoomAt(localPoint(event), Math.exp(-event.deltaY * 0.0015));
    requestDraw();
  };

  return (
    <div className="relative size-full">
      <canvas
        ref={canvasRef}
        // `touch-none` hands every touch gesture to the handlers above.
        // Without it the browser claims them for scrolling and pan/pinch
        // never fire at all.
        className="size-full touch-none"
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
          fitRef.current(true);
        }}
      />
      {hoverTitle && (
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] truncate rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm">
          {hoverTitle}
        </p>
      )}
    </div>
  );
}
