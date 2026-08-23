import { describe, expect, test } from 'bun:test';

import {
  computeTargetDimensions,
  shouldKeepOriginal,
  shouldSkipCompression,
} from './image-compression-rules';

describe('shouldSkipCompression', () => {
  test('skips SVG — canvas/sharp would rasterise a vector', () => {
    expect(shouldSkipCompression('image/svg+xml')).toBe(true);
  });

  test('skips GIF — re-encoding keeps only the first frame', () => {
    expect(shouldSkipCompression('image/gif')).toBe(true);
  });

  test('does not skip the raster formats compression actually targets', () => {
    expect(shouldSkipCompression('image/jpeg')).toBe(false);
    expect(shouldSkipCompression('image/png')).toBe(false);
    expect(shouldSkipCompression('image/webp')).toBe(false);
  });
});

describe('computeTargetDimensions — never upscale', () => {
  test('leaves an image already under the cap at its original size', () => {
    expect(computeTargetDimensions(800, 600, 2048)).toEqual({
      width: 800,
      height: 600,
    });
  });

  test('leaves an image exactly at the cap unchanged', () => {
    expect(computeTargetDimensions(2048, 1024, 2048)).toEqual({
      width: 2048,
      height: 1024,
    });
  });

  test('scales a landscape image down to the cap on its longest edge', () => {
    // 4000x2000, cap 2000 -> longest edge (width) halves, height follows.
    expect(computeTargetDimensions(4000, 2000, 2000)).toEqual({
      width: 2000,
      height: 1000,
    });
  });

  test('caps the LONGEST edge, not literally the width — a portrait photo', () => {
    // 3000x4000: the longest edge is the HEIGHT. Capping at 2000 must shrink
    // height to 2000 and scale width proportionally, not leave width alone.
    expect(computeTargetDimensions(3000, 4000, 2000)).toEqual({
      width: 1500,
      height: 2000,
    });
  });

  test('never upscales a small image to meet the cap', () => {
    expect(computeTargetDimensions(400, 300, 2048)).toEqual({
      width: 400,
      height: 300,
    });
  });

  test('falls back to the input dimensions when a measurement is unknown', () => {
    expect(computeTargetDimensions(0, 0, 2048)).toEqual({ width: 0, height: 0 });
  });
});

describe('shouldKeepOriginal', () => {
  test('keeps the original when compression made the file bigger', () => {
    expect(shouldKeepOriginal(1000, 1200)).toBe(true);
  });

  test('keeps the original when compression made no difference', () => {
    expect(shouldKeepOriginal(1000, 1000)).toBe(true);
  });

  test('uses the compressed bytes when they are actually smaller', () => {
    expect(shouldKeepOriginal(1000, 400)).toBe(false);
  });
});
