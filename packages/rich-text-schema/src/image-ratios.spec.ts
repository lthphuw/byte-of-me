import { describe, expect, it } from 'bun:test';

import { withImageRatios } from './image-ratios';

const plot = 'https://cdn.example/plot.png';
const sized = { [plot]: { width: 1920, height: 670 } };

describe('withImageRatios', () => {
  it('gives an image the aspect ratio of its stored size', () => {
    const html = `<p><img src="${plot}" alt="Plot" width="100%" /></p>`;

    expect(withImageRatios(html, sized)).toBe(
      `<p><img src="${plot}" alt="Plot" width="100%" style="aspect-ratio: 1920 / 670" /></p>`
    );
  });

  it('leaves an image with no stored size alone', () => {
    const html = '<img src="https://cdn.example/other.png" />';

    expect(withImageRatios(html, sized)).toBe(html);
  });

  it('matches the source after the sanitizer escaped its ampersands', () => {
    const url = 'https://cdn.example/p.png?a=1&b=2';
    const html = '<img src="https://cdn.example/p.png?a=1&amp;b=2" />';

    expect(
      withImageRatios(html, { [url]: { width: 800, height: 400 } })
    ).toContain('style="aspect-ratio: 800 / 400"');
  });

  it('never looks a source up through the prototype', () => {
    const html = '<img src="constructor" />';

    expect(withImageRatios(html, {})).toBe(html);
    expect(withImageRatios(html, sized)).toBe(html);
  });

  it('writes nothing for a size that is not two whole, plausible numbers', () => {
    for (const size of [
      { width: 0, height: 10 },
      { width: 1.5, height: 10 },
      { width: 20_000, height: 10 },
      { width: Number.NaN, height: 10 },
    ]) {
      const html = `<img src="${plot}" />`;
      expect(withImageRatios(html, { [plot]: size })).toBe(html);
    }
  });

  it('keeps a self-closing void tag closed', () => {
    expect(withImageRatios(`<img src="${plot}" />`, sized)).toBe(
      `<img src="${plot}" style="aspect-ratio: 1920 / 670" />`
    );
  });
});
