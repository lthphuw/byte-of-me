export interface PixelSize {
  width: number;
  height: number;
}

/** Above this a size is a bad value, not a layout hint. */
const MAX_PX = 10_000;

/** Whole, positive and not absurd: the only sizes allowed to reach a style or a box. */
export function isPixelSize({ width, height }: PixelSize): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_PX &&
    height <= MAX_PX
  );
}
