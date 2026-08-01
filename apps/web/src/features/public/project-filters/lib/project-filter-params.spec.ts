import { describe, expect, it } from 'bun:test';

import {
  buildProjectFilterQuery,
  DEFAULT_PROJECT_FILTERS,
  parseProjectFilters,
} from './project-filter-params';

import { parsePageParam } from '@/shared/lib/filter-params';

describe('parseProjectFilters', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseProjectFilters(new URLSearchParams(''))).toEqual(
      DEFAULT_PROJECT_FILTERS
    );
  });

  it('reads all three facets', () => {
    expect(
      parseProjectFilters(
        new URLSearchParams('tags=web,cli&tech=bun,prisma&q=portfolio')
      )
    ).toEqual({
      tagSlugs: ['web', 'cli'],
      techStackSlugs: ['bun', 'prisma'],
      search: 'portfolio',
    });
  });

  it('keeps every value when tech repeats', () => {
    expect(
      parseProjectFilters(new URLSearchParams('tech=bun&tech=prisma'))
    ).toEqual({
      tagSlugs: [],
      techStackSlugs: ['bun', 'prisma'],
      search: '',
    });
  });

  it('keeps the two slug facets separate', () => {
    expect(parseProjectFilters(new URLSearchParams('tags=web'))).toEqual({
      tagSlugs: ['web'],
      techStackSlugs: [],
      search: '',
    });
  });
});

describe('buildProjectFilterQuery', () => {
  it('omits every default so the unfiltered list keeps a clean URL', () => {
    expect(buildProjectFilterQuery(DEFAULT_PROJECT_FILTERS, 1)).toBe('');
  });

  it('omits page 1 but writes any later page', () => {
    expect(buildProjectFilterQuery(DEFAULT_PROJECT_FILTERS, 2)).toBe('page=2');
  });

  it('writes the facets in a stable order', () => {
    expect(
      buildProjectFilterQuery(
        { tagSlugs: ['web'], techStackSlugs: ['bun'], search: 'cms' },
        3
      )
    ).toBe('tags=web&tech=bun&q=cms&page=3');
  });
});

describe('project filter URL round trip', () => {
  it.each([
    [{ tagSlugs: [], techStackSlugs: [], search: '' }, 1],
    [{ tagSlugs: ['web'], techStackSlugs: [], search: '' }, 5],
    [{ tagSlugs: [], techStackSlugs: ['bun', 'prisma'], search: 'cms' }, 2],
    [{ tagSlugs: ['web', 'cli'], techStackSlugs: ['bun'], search: 'a b' }, 1],
  ])('survives filters -> URL -> filters (%o, page %i)', (filters, page) => {
    const params = new URLSearchParams(buildProjectFilterQuery(filters, page));

    expect(parseProjectFilters(params)).toEqual(filters);
    expect(parsePageParam(params)).toBe(page);
  });
});
