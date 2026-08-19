'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * Placeholder nodes, in the arrangement a force layout actually settles into:
 * two clusters joined by a single bridge, plus two orphans off on their own.
 *
 * Hand-placed rather than generated. The point of a skeleton is to describe
 * the picture that is coming, and a ring of evenly spaced dots describes
 * nothing any real corpus produces — `useGraphSimulation` pulls linked notes
 * together and pushes everything else apart, so clusters are what an author
 * sees. The radii follow `nodeRadius(degree)`'s shape too: the hub of a
 * cluster is the biggest circle in it, and an orphan is the smallest.
 *
 * Coordinates are in the viewBox below, not pixels.
 */
const NODES = [
  { cx: 140, cy: 120, r: 14 },
  { cx: 100, cy: 88, r: 8 },
  { cx: 186, cy: 94, r: 9 },
  { cx: 108, cy: 162, r: 7 },
  { cx: 178, cy: 164, r: 8 },
  { cx: 286, cy: 190, r: 12 },
  { cx: 330, cy: 152, r: 7 },
  { cx: 248, cy: 236, r: 7 },
  { cx: 332, cy: 226, r: 6 },
  { cx: 58, cy: 236, r: 5 },
  { cx: 356, cy: 78, r: 5 },
];

/** Index pairs into `NODES`. The last one is the bridge between the clusters. */
const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [2, 4],
  [5, 6],
  [5, 7],
  [5, 8],
  [6, 8],
  [0, 5],
];

/**
 * `NoteGraph`, loading.
 *
 * It replaces a full-bleed `animate-pulse bg-muted/30` rectangle that was
 * marked `aria-hidden` and nothing else. That failed twice over: a plain wash
 * says only "something is grey here" — it does not say a GRAPH is arriving, so
 * the reader cannot tell it from a rendering bug or from a canvas that painted
 * nothing — and hiding the only thing on screen leaves a screen-reader user on
 * a route with no perceivable content and no indication anything is on its
 * way. `SpaceHubSkeleton` records the same pair of mistakes.
 *
 * The overlays are drawn as well as the plot. They are absolutely positioned,
 * so they cost no layout either way; what they buy is that the placeholder
 * reads as THIS screen rather than as a generic loading panel.
 */
export function NoteGraphSkeleton() {
  const t = useTranslations('dashboard.note.graph');

  return (
    // `aria-busy` + a name on the container, matching `NoteEditorSkeleton` and
    // `SpaceHubSkeleton`; the plot itself stays decorative. `graph.loading`
    // already exists in both catalogues — nothing new enters them here.
    <div
      className="relative size-full"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <svg
        aria-hidden
        className="size-full animate-pulse"
        viewBox="0 0 400 300"
        // `slice`, not the default `meet`: the real canvas fills its box and
        // reframes the graph to fit, so a letterboxed placeholder would leave
        // bands the loaded view then paints over.
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Edges first, so nodes paint over them — the same order
            `NoteGraphCanvas` draws in, and the reason the loaded picture does
            not show line ends poking out of a circle. */}
        {EDGES.map(([from, to]) => {
          const a = NODES[from];
          const b = NODES[to];
          if (!a || !b) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              className="stroke-muted"
              strokeWidth={1.5}
            />
          );
        })}

        {NODES.map((node) => (
          <circle
            key={`${node.cx}-${node.cy}`}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            className="fill-muted"
          />
        ))}
      </svg>

      {/* The node/link counts, at the same corner and the same `text-xs`
          rhythm the loaded view puts them on. */}
      <div className="pointer-events-none absolute right-3 top-3 space-y-0.5">
        <Skeleton aria-hidden className="ml-auto h-3 w-16" />
        <Skeleton aria-hidden className="ml-auto h-3 w-14" />
      </div>

      {/* The interaction hint. `hidden md:block` because the real one is
          desktop-only — drawing it on a phone would add a bar that never
          becomes anything. */}
      <Skeleton
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 hidden h-3 w-56 md:block"
      />
    </div>
  );
}
