import type { SVGProps } from 'react';

import {
  type BrandLayer,
  MARK_LAYERS,
  MARK_PATH,
  MARK_VIEWBOX,
} from '@/shared/lib/brand-mark';

export interface BrandMarkProps
  extends Omit<SVGProps<SVGSVGElement>, 'children'> {
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
      stroke="currentColor"
      strokeWidth={mark.strokeWidth}
      strokeLinecap="round"
    />
  );

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
      {enclosure && (
        <rect
          x={enclosure.x}
          y={enclosure.y}
          width={enclosure.size}
          height={enclosure.size}
          rx={enclosure.rx}
          fill="none"
          stroke="currentColor"
          strokeWidth={enclosure.strokeWidth}
        />
      )}
      {path}
    </svg>
  );
}
