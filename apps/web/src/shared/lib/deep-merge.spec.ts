import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
  it('merges nested objects instead of replacing them', () => {
    expect(deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 3 } })).toEqual({
      a: { x: 1, y: 3 },
    });
  });

  it('applies sources left to right', () => {
    expect(deepMerge({ v: 1 }, { v: 2 }, { v: 3 })).toEqual({ v: 3 });
  });

  it('creates missing intermediate objects', () => {
    expect(deepMerge({} as Record<string, unknown>, { a: { b: 1 } })).toEqual({
      a: { b: 1 },
    });
  });

  it('replaces arrays rather than merging them element-wise', () => {
    // Locale message files rely on this: a translated list overrides the
    // fallback list wholesale.
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({
      list: [9],
    });
  });

  it('returns the target unchanged when there are no sources', () => {
    expect(deepMerge({ a: 1 })).toEqual({ a: 1 });
  });

  it('ignores non-object sources', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, 'nope')).toEqual({ a: 1 });
  });

  it('mutates and returns the target', () => {
    const target = { a: 1 };
    expect(deepMerge(target, { b: 2 })).toBe(target);
  });
});
