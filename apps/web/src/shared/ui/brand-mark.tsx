import type { SVGProps } from 'react';

import {
  type BrandLayer,
  MARK_LAYERS,
  MARK_PATH,
  MARK_VIEWBOX,
} from '@/shared/lib/brand-mark';

export interface BrandMarkProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Which enclosure to draw. Defaults to the bare mark. */
  layer?: BrandLayer;
  /** Rendered box in pixels. Matches lucide's default so it drops in cleanly. */
  size?: number;
}

/**
 * The brand mark, in the app.
 *
 * Geometry comes from `@/shared/lib/brand-mark`, the same module the favicon
 * generator reads, so the tab icon and the mark in the header can never drift
 * apart. Colour does not: a favicon has to guess the tab strip's background
 * from `prefers-color-scheme`, while here `currentColor` inherits whatever the
 * surrounding text is using, which is correct under next-themes' class-based
 * dark mode too.
 */
export function BrandMark({
  layer = 'public',
  size = 24,
  ...props
}: BrandMarkProps) {
  const { mark, enclosure } = MARK_LAYERS[layer];

  const path = (
    <path
      transform={mark.transform}
      d={MARK_PATH}
      fill="none"
      stroke={enclosure?.kind === 'plate' ? '#000' : 'currentColor'}
      strokeWidth={mark.strokeWidth}
      strokeLinecap="round"
    />
  );

  // Stable rather than `useId`: this stays a server component, and two marks of
  // the same layer on one page define byte-identical masks, so the duplicate
  // resolves to the same shape either way.
  const maskId = `brand-mark-${layer}-cut`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      {...props}
    >
      {enclosure?.kind === 'plate' ? (
        <>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={MARK_VIEWBOX}
            height={MARK_VIEWBOX}
          >
            <rect width={MARK_VIEWBOX} height={MARK_VIEWBOX} fill="#fff" />
            {path}
          </mask>
          <rect
            x={enclosure.shape.x}
            y={enclosure.shape.y}
            width={enclosure.shape.size}
            height={enclosure.shape.size}
            rx={enclosure.shape.rx}
            fill="currentColor"
            mask={`url(#${maskId})`}
          />
        </>
      ) : (
        <>
          {enclosure?.kind === 'outline' && (
            <rect
              x={enclosure.shape.x}
              y={enclosure.shape.y}
              width={enclosure.shape.size}
              height={enclosure.shape.size}
              rx={enclosure.shape.rx}
              fill="none"
              stroke="currentColor"
              strokeWidth={enclosure.shape.strokeWidth}
            />
          )}
          {path}
        </>
      )}
    </svg>
  );
}
