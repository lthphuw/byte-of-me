import type { NoteGraphEdge, NoteGraphNode } from '@/entities/note';

/**
 * Pan/zoom state. `x`/`y` are a screen-space offset applied AFTER scaling,
 * which is what makes `zoomAt` able to hold a world point still under the
 * cursor by solving for the offset.
 */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** A graph node once the simulation has given it somewhere to be. */
export interface PositionedNode extends NoteGraphNode {
  x: number;
  y: number;
}

/** Below this zoom titles are noise; at or above it they are the point. */
export const LABEL_ZOOM_THRESHOLD = 1.1;

/**
 * At or below this many nodes, every label is drawn regardless of zoom. A
 * personal corpus of a few dozen notes is legible all at once, and gating it
 * on zoom meant the graph opened with nothing readable on it at all.
 */
export const LABEL_ALWAYS_NODES = 60;

/** Past this many nodes the renderer drops labels outright — spec §8. */
export const LARGE_GRAPH_NODES = 1500;

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const BASE_RADIUS = 4;
const RADIUS_PER_LINK = 2.2;

/**
 * Radius by degree, on a square root so a hub with fifty links reads as
 * prominent without covering its neighbourhood.
 *
 * An orphan keeps the full `BASE_RADIUS`: the spec's reason for drawing
 * unlinked notes at all (§6.6) is that they are the ones worth noticing, so
 * they are distinguished by being dimmer — a renderer decision — never by
 * being smaller or absent.
 */
export function nodeRadius(degree: number): number {
  return BASE_RADIUS + RADIUS_PER_LINK * Math.sqrt(degree);
}

export function worldToScreen(
  point: { x: number; y: number },
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

export function screenToWorld(
  point: { x: number; y: number },
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * The node under a screen point, or `null`.
 *
 * Iterates BACKWARDS on purpose: the renderer paints in array order, so the
 * visually topmost node of an overlapping pair is the last one in the array.
 * A forward scan returns the node underneath — which opens a note the author
 * cannot even see.
 *
 * The hit radius is padded by four screen pixels. An orphan at low zoom is a
 * sub-5px circle, which is an unhittable target with a finger.
 */
export function hitTest(
  nodes: PositionedNode[],
  screen: { x: number; y: number },
  viewport: Viewport
): PositionedNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node) continue;
    const at = worldToScreen(node, viewport);
    const radius = nodeRadius(node.degree) * viewport.scale + 4;
    const dx = screen.x - at.x;
    const dy = screen.y - at.y;
    if (dx * dx + dy * dy <= radius * radius) return node;
  }
  return null;
}

/** Everything one hop from `id`, in either direction, excluding `id` itself. */
export function neighbourIds(
  edges: NoteGraphEdge[],
  id: string
): Set<string> {
  const out = new Set<string>();
  for (const edge of edges) {
    if (edge.source === id) out.add(edge.target);
    if (edge.target === id) out.add(edge.source);
  }
  // A self-link is legal in the data and meaningless as a "neighbour".
  out.delete(id);
  return out;
}

export function shouldDrawLabels(
  viewport: Viewport,
  nodeCount: number
): boolean {
  if (nodeCount > LARGE_GRAPH_NODES) return false;
  if (nodeCount <= LABEL_ALWAYS_NODES) return true;
  return viewport.scale >= LABEL_ZOOM_THRESHOLD;
}

/**
 * The viewport that brings every node on screen, centred, with room around
 * the edges for the labels that hang below each one.
 *
 * The simulation lays out in world coordinates around the origin and has no
 * idea how big the canvas is — so without this the graph opens wherever the
 * forces happened to leave it, typically with half the nodes past the edges
 * and the rest clustered in a corner. Called once when the layout first
 * settles, and again on the double-click "tidy up" gesture; never while the
 * author is panning, which would fight them for control of the view.
 *
 * A degenerate bounding box (one node, or several stacked) would make the
 * fit ratio divide by ~zero, so the span has a floor and the resulting scale
 * is capped at 1 — zooming to 8x on a single note is not "fitting" it.
 */
export function fitViewport(
  nodes: PositionedNode[],
  width: number,
  height: number,
  padding = 56
): Viewport {
  if (nodes.length === 0) {
    return { x: width / 2, y: height / 2, scale: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const radius = nodeRadius(node.degree);
    minX = Math.min(minX, node.x - radius);
    minY = Math.min(minY, node.y - radius);
    maxX = Math.max(maxX, node.x + radius);
    maxY = Math.max(maxY, node.y + radius);
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const usableWidth = Math.max(width - padding * 2, 1);
  const usableHeight = Math.max(height - padding * 2, 1);

  const scale = clampScale(
    Math.min(1, Math.min(usableWidth / spanX, usableHeight / spanY))
  );

  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  return {
    scale,
    x: width / 2 - centreX * scale,
    y: height / 2 - centreY * scale,
  };
}
