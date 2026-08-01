import { describe, expect, it } from 'bun:test';

import {
  parsePageParam,
  parseSlugListParam,
  searchHistoryMode,
} from './filter-params';

describe('parseSlugListParam', () => {
  it('splits the comma-joined list the filters serialise', () => {
    expect(
      parseSlugListParam(new URLSearchParams('tags=react,nextjs'), 'tags')
    ).toEqual(['react', 'nextjs']);
  });

  it('keeps every value when a param is repeated', () => {
    expect(
      parseSlugListParam(new URLSearchParams('tags=react&tags=nextjs'), 'tags')
    ).toEqual(['react', 'nextjs']);
  });

  it('flattens repeated params that are themselves comma lists', () => {
    expect(
      parseSlugListParam(
        new URLSearchParams('tags=react,nextjs&tags=prisma'),
        'tags'
      )
    ).toEqual(['react', 'nextjs', 'prisma']);
  });

  it('returns an empty list for a missing param', () => {
    expect(parseSlugListParam(new URLSearchParams('q=hello'), 'tags')).toEqual(
      []
    );
  });

  it('drops empty segments instead of emitting blank slugs', () => {
    expect(parseSlugListParam(new URLSearchParams('tags=,,'), 'tags')).toEqual(
      []
    );
    expect(
      parseSlugListParam(new URLSearchParams('tags=react,,'), 'tags')
    ).toEqual(['react']);
  });

  it('trims whitespace around hand-written values', () => {
    expect(
      parseSlugListParam(new URLSearchParams('tags= react , nextjs '), 'tags')
    ).toEqual(['react', 'nextjs']);
  });

  it('reads only the requested key', () => {
    const params = new URLSearchParams('tags=react&tech=bun');
    expect(parseSlugListParam(params, 'tech')).toEqual(['bun']);
  });
});

describe('parsePageParam', () => {
  it('falls back to page 1 when the param is missing', () => {
    expect(parsePageParam(new URLSearchParams(''))).toBe(1);
  });

  it('reads a valid page', () => {
    expect(parsePageParam(new URLSearchParams('page=3'))).toBe(3);
  });

  it('falls back to page 1 for a non-numeric page', () => {
    expect(parsePageParam(new URLSearchParams('page=abc'))).toBe(1);
  });

  it('falls back to page 1 for an empty page value', () => {
    expect(parsePageParam(new URLSearchParams('page='))).toBe(1);
  });

  it('raises a negative page to 1', () => {
    expect(parsePageParam(new URLSearchParams('page=-5'))).toBe(1);
  });

  it('floors a fractional page', () => {
    expect(parsePageParam(new URLSearchParams('page=2.7'))).toBe(2);
  });

  it('bounds an absurd page instead of passing it to the query', () => {
    const page = parsePageParam(new URLSearchParams('page=1e999'));
    expect(Number.isSafeInteger(page)).toBe(true);
    expect(page).toBe(100_000);
  });

  it('reads a custom param name', () => {
    expect(parsePageParam(new URLSearchParams('p=4&page=9'), 'p')).toBe(4);
  });
});

describe('searchHistoryMode', () => {
  it('pushes the first search so Back returns to the unfiltered list', () => {
    expect(searchHistoryMode('', 'react')).toBe('push');
  });

  it('pushes the clear so Back restores the search that was cleared', () => {
    expect(searchHistoryMode('react', '')).toBe('push');
  });

  it('replaces while refining a term already in the URL', () => {
    expect(searchHistoryMode('rea', 'reac')).toBe('replace');
    expect(searchHistoryMode('reac', 'rea')).toBe('replace');
  });

  it('replaces a no-op empty write rather than minting a dead entry', () => {
    expect(searchHistoryMode('', '')).toBe('replace');
  });
});
