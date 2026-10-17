// A mermaid diagram's natural size, carried from the editor to the reader as `data-mermaid-size="WxH"`.
// Mermaid draws no wider than the viewBox, so the reader can reserve the exact box before the
// library loads, and the swap shifts nothing.

import { isPixelSize, type PixelSize } from '@byte-of-me/ui-utils';

export type MermaidSize = PixelSize;

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
  return isPixelSize(size) ? size : null;
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
  return isPixelSize(size) ? size : null;
}
