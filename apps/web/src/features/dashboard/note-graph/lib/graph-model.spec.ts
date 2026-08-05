/**
 * The graph's arithmetic, extracted from the canvas so it can be tested
 * without one. Everything here is pure; the renderer and the simulation both
 * read it and neither owns it. The cases that matter are the ones a canvas
 * would hide: hit-testing under a zoom transform, and the two "don't draw
 * labels" rules that keep a large graph legible.
 */
import { describe, expect, it } from 'bun:test';

import {
  clampScale,
  fitViewport,
  hitTest,
  LABEL_ALWAYS_NODES,
  LABEL_ZOOM_THRESHOLD,
  LARGE_GRAPH_NODES,
  neighbourIds,
  nodeRadius,
  type PositionedNode,
  screenToWorld,
  shouldDrawLabels,
  worldToScreen,
} from './graph-model';

const node = (
  id: string,
  x: number,
  y: number,
  degree = 0
): PositionedNode => ({
  id,
  title: id.toUpperCase(),
  status: 'draft',
  labelIds: [],
  degree,
  x,
  y,
});

describe('nodeRadius', () => {
  it('gives an orphan a visible radius', () => {
    expect(nodeRadius(0)).toBeGreaterThan(0);
  });

  it('grows with degree, but sublinearly', () => {
    const r1 = nodeRadius(1);
    const r16 = nodeRadius(16);
    expect(r16).toBeGreaterThan(r1);
    // 16x the links must not mean 16x the radius, or one hub node swallows
    // the canvas.
    expect(r16).toBeLessThan(r1 * 16);
  });

  it('is monotonic', () => {
    expect(nodeRadius(5)).toBeGreaterThanOrEqual(nodeRadius(4));
  });
});

describe('worldToScreen / screenToWorld', () => {
  it('round-trips through an arbitrary viewport', () => {
    const viewport = { x: 120, y: -40, scale: 1.75 };
    const world = { x: 33, y: -12 };
    const back = screenToWorld(worldToScreen(world, viewport), viewport);
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
  });

  it('is the identity at the identity viewport', () => {
    expect(worldToScreen({ x: 7, y: 9 }, { x: 0, y: 0, scale: 1 })).toEqual({
      x: 7,
      y: 9,
    });
  });
});

describe('hitTest', () => {
  const nodes = [node('a', 0, 0), node('b', 200, 0)];
  const viewport = { x: 0, y: 0, scale: 1 };

  it('finds the node under the pointer', () => {
    expect(hitTest(nodes, { x: 0, y: 0 }, viewport)?.id).toBe('a');
  });

  it('misses empty space', () => {
    expect(hitTest(nodes, { x: 100, y: 100 }, viewport)).toBeNull();
  });

  it('accounts for the viewport transform', () => {
    const zoomed = { x: 0, y: 0, scale: 2 };
    // `b` sits at world x=200, which is screen x=400 at scale 2 — so the
    // screen point that used to hit it now hits nothing.
    expect(hitTest(nodes, { x: 400, y: 0 }, zoomed)?.id).toBe('b');
    expect(hitTest(nodes, { x: 200, y: 0 }, zoomed)).toBeNull();
  });

  it('returns the node drawn LAST when two overlap', () => {
    // The renderer paints in array order, so the visually topmost node of an
    // overlapping pair is the last one — a forward scan would return the one
    // the author cannot see and open the wrong note.
    const stacked = [node('under', 0, 0), node('over', 0, 0)];
    expect(hitTest(stacked, { x: 0, y: 0 }, viewport)?.id).toBe('over');
  });
});

describe('neighbourIds', () => {
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'c', target: 'a' },
    { source: 'b', target: 'c' },
  ];

  it('includes both directions', () => {
    expect([...neighbourIds(edges, 'a')].sort()).toEqual(['b', 'c']);
  });

  it('never includes the node itself', () => {
    // A self-link is legal in the data (a note whose body links to itself)
    // and meaningless as a neighbour.
    expect(neighbourIds([{ source: 'a', target: 'a' }], 'a').has('a')).toBe(
      false
    );
  });

  it('is empty for a node with no edges', () => {
    expect(neighbourIds(edges, 'zzz').size).toBe(0);
  });
});

describe('clampScale', () => {
  it('keeps the graph reachable at both ends', () => {
    expect(clampScale(1000)).toBeLessThanOrEqual(8);
    expect(clampScale(0.0001)).toBeGreaterThanOrEqual(0.1);
    expect(clampScale(2)).toBe(2);
  });
});

describe('shouldDrawLabels', () => {
  // A graph small enough to label entirely is labelled entirely, whatever the
  // zoom. The first version keyed on zoom alone, which meant a 13-note graph
  // opened with no labels at all and nothing to read until the author
  // happened to scroll — the view was unusable at its own default.
  it('labels a small graph even when zoomed out', () => {
    expect(shouldDrawLabels({ x: 0, y: 0, scale: 0.4 }, 10)).toBe(true);
  });

  it('hides labels on a mid-sized graph until zoomed in', () => {
    const many = LABEL_ALWAYS_NODES + 1;
    expect(shouldDrawLabels({ x: 0, y: 0, scale: 0.4 }, many)).toBe(false);
    expect(
      shouldDrawLabels({ x: 0, y: 0, scale: LABEL_ZOOM_THRESHOLD }, many)
    ).toBe(true);
  });

  it('drops them entirely on a very large graph, however far zoomed in', () => {
    expect(
      shouldDrawLabels({ x: 0, y: 0, scale: 4 }, LARGE_GRAPH_NODES + 1)
    ).toBe(false);
  });
});

describe('fitViewport', () => {
  it('centres a single node without absurd zoom', () => {
    const viewport = fitViewport([node('a', 50, 50)], 800, 600);
    const at = worldToScreen({ x: 50, y: 50 }, viewport);
    expect(at.x).toBeCloseTo(400, 6);
    expect(at.y).toBeCloseTo(300, 6);
    // A zero-size bounding box must not divide its way to MAX_SCALE.
    expect(viewport.scale).toBeLessThanOrEqual(1);
  });

  it('brings every node inside the canvas', () => {
    const nodes = [
      node('a', -900, -700),
      node('b', 900, 700),
      node('c', 0, 0, 20),
    ];
    const viewport = fitViewport(nodes, 800, 600);

    for (const n of nodes) {
      const at = worldToScreen(n, viewport);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.x).toBeLessThanOrEqual(800);
      expect(at.y).toBeLessThanOrEqual(600);
    }
  });

  it('centres the bounding box', () => {
    const viewport = fitViewport(
      [node('a', -100, -100), node('b', 300, 100)],
      800,
      600
    );
    const centre = worldToScreen({ x: 100, y: 0 }, viewport);
    expect(centre.x).toBeCloseTo(400, 6);
    expect(centre.y).toBeCloseTo(300, 6);
  });

  it('is a no-op-ish identity for an empty node set', () => {
    const viewport = fitViewport([], 800, 600);
    expect(viewport.scale).toBe(1);
    expect(viewport.x).toBe(400);
    expect(viewport.y).toBe(300);
  });

  it('never returns a scale outside the clamp', () => {
    const tiny = fitViewport([node('a', 0, 0), node('b', 0.0001, 0)], 800, 600);
    expect(tiny.scale).toBeLessThanOrEqual(8);
    const huge = fitViewport(
      [node('a', -1e6, -1e6), node('b', 1e6, 1e6)],
      800,
      600
    );
    expect(huge.scale).toBeGreaterThanOrEqual(0.1);
  });
});
