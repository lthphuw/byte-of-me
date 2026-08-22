/**
 * The brand mark — one definition, every surface.
 *
 * The mark is an off-centre bezier spiral whose outer end is pulled into a
 * short leg, so it reads as a spiral first and suggests a "P" second. It is
 * drawn as a single open stroke: no fill, no counters, nothing that closes up
 * when the raster gets down to 16px.
 *
 * Everything that draws the mark reads it from here:
 *
 *   - `scripts/gen-icons.ts` renders the five favicon SVGs from
 *     `renderFaviconSvg`, then rasterises them to PNG/ICO.
 *   - `@/shared/ui/brand-mark` renders it in the app (header, footer, sidebars,
 *     auth screens) using `currentColor`.
 *   - `app/api/og/route.tsx` inlines `MARK_PATH` into the social card.
 *
 * So changing the mark means editing this file and running `bun run gen:icons`.
 * Nothing else references the geometry, and `icon-set.spec.ts` fails if the
 * committed assets drift from what this file describes.
 */

/**
 * The three access layers the site is split into.
 *
 * They differ only by enclosure — bare, framed, sealed — never by colour. A
 * favicon is 16px of monochrome on an unknown background; a hue is the first
 * thing that stops being legible there, and a silhouette is the last.
 */
export type BrandLayer = 'public' | 'cms' | 'space';

export const BRAND_LAYERS: readonly BrandLayer[] = ['public', 'cms', 'space'];

/** Every placement below is expressed inside this box. */
export const MARK_VIEWBOX = 24;

/**
 * The mark. Authored against a 24-unit box with roughly 2 units of margin, so
 * a placement of `translate(-0.4 0.7)` at scale 1 fills the box optically.
 */
export const MARK_PATH =
  'M3.1 20.4C2.7 18 2.5 15.9 2.5 14C2.5 6.8 8 2.2 14.2 2.2C19.4 2.2 22.3 6 22.3 10.4C22.3 15.4 18.4 18.8 13.6 18.8C9.8 18.8 7.2 16.3 7.2 13.2C7.2 10.6 9.2 8.6 11.8 8.6C13.8 8.6 15.2 10 15.2 11.8';

/** Where the mark sits inside a 24-unit box, and how heavy its stroke is. */
export interface MarkPlacement {
  transform: string;
  strokeWidth: number;
}

/** A rounded rectangle covering most of the box — the frame or the plate. */
export interface MarkEnclosure {
  x: number;
  y: number;
  size: number;
  rx: number;
  /** Set for a drawn outline; omitted when the shape is filled instead. */
  strokeWidth?: number;
}

export interface LayerGeometry {
  mark: MarkPlacement;
  /** `outline` draws the frame, `plate` fills it and knocks the mark out. */
  enclosure?: { kind: 'outline' | 'plate'; shape: MarkEnclosure };
}

export const MARK_LAYERS: Record<BrandLayer, LayerGeometry> = {
  /** Bare stroke, no enclosure — the identity in its plainest form. */
  public: {
    mark: { transform: 'translate(-0.4 0.7)', strokeWidth: 2.3 },
  },

  /**
   * The densest cell in the system: a frame wrapped around a spiral inside a
   * 16px box. Three variants were rasterised at true 16px and compared, and
   * matching the two stroke weights — the obvious choice — was the muddiest,
   * because frame and mark then compete for the same reading. What survives is
   * a deliberately dominant frame with the mark pulled in smaller to buy
   * separation, even though that leaves the mark smaller than in the other two
   * layers.
   */
  cms: {
    mark: { transform: 'translate(4.78 5.4) scale(0.58)', strokeWidth: 3.1 },
    enclosure: {
      kind: 'outline',
      shape: { x: 1.1, y: 1.1, size: 21.8, rx: 5.2, strokeWidth: 2 },
    },
  },

  /**
   * Fully sealed: the mark is knocked out of a solid plate, so the silhouette
   * alone separates a vault tab from the other two at 16px.
   */
  space: {
    mark: { transform: 'translate(3.19 3.98) scale(0.71)', strokeWidth: 2.9 },
    enclosure: {
      kind: 'plate',
      shape: { x: 1, y: 1, size: 22, rx: 5.5 },
    },
  },
};

/** Straight from globals.css, so the mark and the site agree on ink. */
const INK_LIGHT = '#0a0a0a'; // --background 0 0% 3.9%
const INK_DARK = '#fafafa'; // --foreground 0 0% 98%

/** Matches the manifest's background_color / theme_color. */
const STANDALONE_BACKGROUND = '#0f0f1a';

/** The generated files, in the order `gen:icons` writes them. */
export const FAVICON_FILES = [
  'mark-public.svg',
  'mark-cms.svg',
  'mark-space.svg',
  'apple-touch.svg',
  'maskable.svg',
] as const;

export type FaviconFile = (typeof FAVICON_FILES)[number];

function markPath(
  { transform, strokeWidth }: MarkPlacement,
  { stroke, className }: { stroke: string; className?: string }
): string {
  const cls = className ? `class="${className}" ` : '';
  return `<path ${cls}transform="${transform}"
        d="${MARK_PATH}"
        fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
}

function svg(label: string, comment: string, body: string): string {
  const indented = comment
    .trim()
    .split('\n')
    .map((line, index) => (index === 0 ? line : `       ${line.trim()}`))
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" role="img" aria-label="${label}">
  <!-- GENERATED by \`bun run gen:icons\` from src/shared/lib/brand-mark.ts.
       Edit that file, not this one.

       ${indented} -->
  ${body.trim()}
</svg>
`;
}

/**
 * A tab favicon for one access layer.
 *
 * The ink colour is declared twice on purpose: the presentation attribute is
 * what SVG rasterisers without CSS support fall back to, and the class is what
 * lets a browser invert the mark on a dark tab strip. PNG and ICO cannot adapt
 * at all, which is why `buildIconSet` lists the SVG first.
 */
function renderLayerSvg(layer: BrandLayer): string {
  const { mark, enclosure } = MARK_LAYERS[layer];
  const label =
    layer === 'public'
      ? 'Byte of me'
      : `Byte of me — ${layer === 'cms' ? 'dashboard' : 'private space'}`;

  const theme = (property: 'stroke' | 'fill', name: string) =>
    `<style>
    .${name} { ${property}: ${INK_LIGHT} }
    @media (prefers-color-scheme: dark) { .${name} { ${property}: ${INK_DARK} } }
  </style>`;

  if (!enclosure) {
    return svg(
      label,
      'Public layer: bare stroke, no enclosure.',
      `${theme('stroke', 'ink')}
  ${markPath(mark, { stroke: INK_LIGHT, className: 'ink' })}`
    );
  }

  const { shape } = enclosure;

  if (enclosure.kind === 'outline') {
    return svg(
      label,
      `CMS layer: the mark gains a frame. Enclosure encodes access level.`,
      `${theme('stroke', 'ink')}
  <rect class="ink" x="${shape.x}" y="${shape.y}" width="${shape.size}" height="${shape.size}" rx="${shape.rx}"
        fill="none" stroke="${INK_LIGHT}" stroke-width="${shape.strokeWidth}"/>
  ${markPath(mark, { stroke: INK_LIGHT, className: 'ink' })}`
    );
  }

  // The mask is luminance-based and therefore theme-independent: only the plate
  // fill flips, which inverts plate and mark together.
  return svg(
    label,
    'Space layer: fully sealed. The mark is knocked out of a solid plate.',
    `${theme('fill', 'plate')}
  <mask id="space-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}">
    <rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" fill="#fff"/>
    ${markPath(mark, { stroke: '#000' }).replace(/\n {8}/g, '\n          ')}
  </mask>
  <rect class="plate" x="${shape.x}" y="${shape.y}" width="${shape.size}" height="${shape.size}" rx="${shape.rx}"
        fill="${INK_LIGHT}" mask="url(#space-cut)"/>`
  );
}

/**
 * The home-screen and launcher icons.
 *
 * Both are opaque and neither adapts to the colour scheme: iOS composites its
 * icon over its own background and handles transparency badly, and a launcher
 * icon is baked once at install time. The maskable one holds the mark inside
 * the 80% safe circle because Android may crop it to any shape.
 */
const STANDALONE: Record<
  'apple-touch.svg' | 'maskable.svg',
  { comment: string; background: string; ink: string; placement: MarkPlacement }
> = {
  'apple-touch.svg': {
    comment: `Home-screen icon. Opaque on purpose: iOS composites it over its own
background and handles transparency badly. Same dark plate as the
launcher icon and the manifest's background_color, so an install looks
the same on both platforms.`,
    background: STANDALONE_BACKGROUND,
    ink: INK_DARK,
    // Composed, not nested: the trailing translate is the same optical
    // centring the public layer applies, carried through the scale.
    placement: {
      transform: 'translate(2.64 2.64) scale(0.78) translate(-0.4 0.7)',
      strokeWidth: 2.6,
    },
  },
  'maskable.svg': {
    comment: `Android maskable icon. The launcher may crop this to any shape, so the
mark is held inside the 80% safe circle and the background runs full
bleed, matching background_color so the crop seam is invisible.`,
    background: STANDALONE_BACKGROUND,
    ink: INK_DARK,
    placement: {
      transform: 'translate(5.4 5.4) scale(0.55) translate(-0.4 0.7)',
      strokeWidth: 3.6,
    },
  },
};

function renderStandaloneSvg(file: keyof typeof STANDALONE): string {
  const { comment, background, ink, placement } = STANDALONE[file];
  return svg(
    'Byte of me',
    comment,
    `<rect width="${MARK_VIEWBOX}" height="${MARK_VIEWBOX}" fill="${background}"/>
  ${markPath(placement, { stroke: ink })}`
  );
}

/** Renders one favicon source file. The generator writes what this returns. */
export function renderFaviconSvg(file: FaviconFile): string {
  switch (file) {
    case 'mark-public.svg':
      return renderLayerSvg('public');
    case 'mark-cms.svg':
      return renderLayerSvg('cms');
    case 'mark-space.svg':
      return renderLayerSvg('space');
    default:
      return renderStandaloneSvg(file);
  }
}
