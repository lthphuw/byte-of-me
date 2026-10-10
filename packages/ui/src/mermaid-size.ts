// A rendered mermaid diagram's natural size, carried from the editor to the reader as
// `data-mermaid-size="WxH"` on the code block. Mermaid draws its SVG no wider than the
// viewBox, so the reader can reserve exactly the box the diagram will fill before the
// library has loaded: the source block is swapped for a diagram of the same shape.

export const MERMAID_SIZE_ATTR = 'data-mermaid-size';

/** Above this a diagram is not a layout hint any more; it is a bad value. */
const MAX_DIAGRAM_PX = 10_000;

export interface MermaidSize {
  width: number;
  height: number;
}

function isSize({ width, height }: MermaidSize): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_DIAGRAM_PX &&
    height <= MAX_DIAGRAM_PX
  );
}

/** The viewBox of a rendered mermaid SVG, rounded to whole pixels; null without one. */
export function svgNaturalSize(svg: string): MermaidSize | null {
  const match = /viewBox\s*=\s*["']([^"']+)["']/.exec(svg);
  if (!match) return null;

  const parts = match[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4) return null;

  const size = { width: Math.round(parts[2]), height: Math.round(parts[3]) };
  return isSize(size) ? size : null;
}

export function formatMermaidSize({ width, height }: MermaidSize): string {
  return `${width}x${height}`;
}

/** Reads the attribute back; anything that is not a plausible `WxH` is no size. */
export function parseMermaidSize(
  value: string | null | undefined
): MermaidSize | null {
  const match = /^(\d+)x(\d+)$/.exec(value ?? '');
  if (!match) return null;

  const size = { width: Number(match[1]), height: Number(match[2]) };
  return isSize(size) ? size : null;
}
