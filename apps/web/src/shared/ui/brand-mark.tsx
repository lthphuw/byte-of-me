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
 * The brand mark. Geometry comes from `@/shared/lib/brand-mark`, which the favicon
 * generator also reads, so tab icon and header mark cannot drift. Colour is
 * `currentColor` (a favicon must guess its background from `prefers-color-scheme`).
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
