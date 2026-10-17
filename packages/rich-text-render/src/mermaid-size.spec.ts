import { describe, expect, it } from 'bun:test';

import {
  formatMermaidSize,
  parseMermaidSize,
  svgNaturalSize,
} from './mermaid-size';

describe('svgNaturalSize', () => {
  it('reads the viewBox of a rendered diagram, rounded to whole pixels', () => {
    const svg =
      '<svg width="100%" viewBox="0 0 612.4 287.6" role="graphics"></svg>';

    expect(svgNaturalSize(svg)).toEqual({ width: 612, height: 288 });
  });

  it('accepts a comma-separated viewBox', () => {
    expect(svgNaturalSize('<svg viewBox="0,0,400,200">')).toEqual({
      width: 400,
      height: 200,
    });
  });

  it('gives no size without a usable viewBox', () => {
    expect(svgNaturalSize('<svg width="100"></svg>')).toBeNull();
    expect(svgNaturalSize('<svg viewBox="0 0 400"></svg>')).toBeNull();
    expect(svgNaturalSize('<svg viewBox="0 0 0 200"></svg>')).toBeNull();
  });
});

describe('parseMermaidSize', () => {
  it('reads back what formatMermaidSize wrote', () => {
    const size = { width: 612, height: 288 };

    expect(parseMermaidSize(formatMermaidSize(size))).toEqual(size);
  });

  it('drops anything that is not a plausible WxH', () => {
    for (const value of [
      null,
      undefined,
      '',
      '600',
      '600x',
      '0x400',
      '10001x5',
      '60x40px',
      '6e2x4',
    ]) {
      expect(parseMermaidSize(value)).toBeNull();
    }
  });
});
