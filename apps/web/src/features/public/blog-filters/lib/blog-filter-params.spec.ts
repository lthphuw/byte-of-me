import { describe, expect, it } from 'bun:test';

import {
  buildBlogFilterQuery,
  DEFAULT_BLOG_FILTERS,
  parseBlogFilters,
} from './blog-filter-params';

import { parsePageParam } from '@/shared/lib/filter-params';

describe('parseBlogFilters', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseBlogFilters(new URLSearchParams(''))).toEqual(
      DEFAULT_BLOG_FILTERS
    );
  });

  it('reads tags and the search term', () => {
    expect(parseBlogFilters(new URLSearchParams('tags=react,bun&q=hydration')))
      .toEqual({ tagSlugs: ['react', 'bun'], search: 'hydration' });
  });

  it('keeps every tag when the param repeats', () => {
    expect(
      parseBlogFilters(new URLSearchParams('tags=react&tags=bun'))
    ).toEqual({ tagSlugs: ['react', 'bun'], search: '' });
  });

  it('treats an empty tags param as no tag filter', () => {
    expect(parseBlogFilters(new URLSearchParams('tags='))).toEqual({
      tagSlugs: [],
      search: '',
    });
  });
});

describe('buildBlogFilterQuery', () => {
  it('omits every default so the unfiltered list keeps a clean URL', () => {
    expect(buildBlogFilterQuery(DEFAULT_BLOG_FILTERS, 1)).toBe('');
  });

  it('omits page 1 but writes any later page', () => {
    expect(buildBlogFilterQuery(DEFAULT_BLOG_FILTERS, 4)).toBe('page=4');
  });

  it('comma-joins the tags and carries the search term', () => {
    expect(
      buildBlogFilterQuery({ tagSlugs: ['react', 'bun'], search: 'rsc' }, 2)
    ).toBe('tags=react%2Cbun&q=rsc&page=2');
  });
});

describe('blog filter URL round trip', () => {
  it.each([
    [{ tagSlugs: [], search: '' }, 1],
    [{ tagSlugs: ['react'], search: '' }, 3],
    [{ tagSlugs: ['react', 'bun'], search: 'hydration key' }, 2],
    [{ tagSlugs: [], search: 'a=b&c' }, 1],
  ])('survives filters -> URL -> filters (%o, page %i)', (filters, page) => {
    const params = new URLSearchParams(buildBlogFilterQuery(filters, page));

    expect(parseBlogFilters(params)).toEqual(filters);
    expect(parsePageParam(params)).toBe(page);
  });
});
