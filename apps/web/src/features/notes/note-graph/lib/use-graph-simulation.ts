'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';

import type { NoteGraph } from '@/entities/note';
import {
  nodeRadius,
  type PositionedNode,
} from '@/features/notes/note-graph/lib/graph-model';

/** What d3 mutates: our node, plus the fields the simulation writes onto it. */
type SimNode = PositionedNode & SimulationNodeDatum;

export interface GraphSimulation {
  /**
   * Live nodes, mutated in place by d3. Read this inside the render loop and
   * never in JSX — the array identity never changes, so React would not see
   * an update anyway.
   */
  nodesRef: React.RefObject<PositionedNode[]>;
  /** Pins a node while it is dragged; `null` releases and lets it settle. */
  setDragged: (id: string | null, world?: { x: number; y: number }) => void;
  /** Kicks the layout back up — the double-click "re-settle" gesture. */
  reheat: () => void;
}

/**
 * The force layout, kept entirely out of React state.
 *
 * d3-force mutates its node objects on every tick, sixty times a second.
 * Copying that into `useState` would re-render the whole tree at 60 Hz for a
 * picture React does not draw; instead the nodes live in a ref, d3 writes to
 * them in place, and `onTick` only asks the canvas to repaint. React never
 * sees a coordinate.
 *
 * The simulation stops while the tab is hidden (spec §6.6). Not just for the
 * battery: a background tab has its rAF paused, so the ticks would pile up
 * against a canvas that never paints and the layout would jump on return
 * rather than animate.
 */
export function useGraphSimulation(
  graph: NoteGraph | undefined,
  onTick: () => void,
  onSettle?: () => void
): GraphSimulation {
  const nodesRef = useRef<PositionedNode[]>([]);
  const simulationRef = useRef<Simulation<SimNode, undefined> | null>(null);
  // `onTick` is an arrow created in the caller's render. Holding it in a ref
  // keeps it out of the effect's dependencies, so a repaint does not rebuild
  // the entire simulation and throw away every node position with it.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    if (!graph) return;

    // Seeded on a small ring rather than all at (0,0): d3 resolves exactly
    // coincident nodes with random jitter, which makes the opening frames
    // look like an explosion. A ring gives the charge force something to push
    // apart from immediately.
    const nodes: SimNode[] = graph.nodes.map((node, index) => {
      const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
      const radius = 40 + Math.sqrt(graph.nodes.length) * 12;
      return { ...node, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
    nodesRef.current = nodes;

    // `forceLink` REPLACES each endpoint string with a node object reference
    // as a side effect. These have to be copies: mutating `graph.edges` would
    // corrupt the object TanStack Query is caching, and the renderer reads
    // that same array expecting strings.
    const links = graph.edges.map((edge) => ({ ...edge }));

    const simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink<SimNode, (typeof links)[number]>(links)
          .id((node) => node.id)
          .distance(60)
          .strength(0.35)
      )
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(0, 0))
      .force(
        'collide',
        // The padding is for the LABEL, not the circle: a title is drawn
        // directly under each node, so packing nodes to their own radii
        // guarantees the text collides even when the dots do not.
        forceCollide<SimNode>().radius((node) => nodeRadius(node.degree) + 14)
      )
      .on('tick', () => onTickRef.current())
      // d3 fires `end` once alpha decays below alphaMin — the moment the
      // layout has stopped moving and is therefore worth framing. Dragging
      // holds `alphaTarget` above that floor, so this does not fire in the
      // middle of an interaction and yank the view out from under the author.
      .on('end', () => onSettleRef.current?.());

    simulationRef.current = simulation;

    const onVisibilityChange = () => {
      if (document.hidden) simulation.stop();
      else simulation.alpha(0.15).restart();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      simulation.stop();
      simulationRef.current = null;
    };
  }, [graph]);

  const setDragged = useCallback(
    (id: string | null, world?: { x: number; y: number }) => {
      const simulation = simulationRef.current;
      if (!simulation) return;
      const nodes = nodesRef.current as SimNode[];

      if (id === null) {
        // Release every pin. A drag can only ever hold one, and clearing all
        // of them is cheaper than remembering which — and immune to a pointer
        // sequence that lost its `pointerup`.
        for (const node of nodes) {
          node.fx = null;
          node.fy = null;
        }
        simulation.alphaTarget(0);
        return;
      }

      const node = nodes.find((candidate) => candidate.id === id);
      if (!node || !world) return;
      node.fx = world.x;
      node.fy = world.y;
      // A non-zero alphaTarget keeps the layout live *while* dragging, so the
      // neighbourhood follows the finger instead of snapping into place when
      // it lifts.
      simulation.alphaTarget(0.25).restart();
    },
    []
  );

  const reheat = useCallback(() => {
    simulationRef.current?.alpha(0.3).restart();
  }, []);

  return { nodesRef, setDragged, reheat };
}
