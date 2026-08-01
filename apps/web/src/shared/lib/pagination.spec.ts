import { describe, expect, it } from 'bun:test';

import { buildPaginatedMeta, clampPagination, MAX_PAGE } from './pagination';

describe('clampPagination', () => {
  it('passes through in-range values', () => {
    expect(clampPagination({ page: 2, limit: 12 })).toEqual({
      page: 2,
      limit: 12,
    });
  });

  it('applies defaults when params are missing', () => {
    expect(clampPagination({})).toEqual({ page: 1, limit: 12 });
  });

  it('clamps oversized limits to the ceiling', () => {
    expect(clampPagination({ page: 0, limit: 1_000_000 })).toEqual({
      page: 1,
      limit: 50,
    });
  });

  it('floors fractional values and raises sub-1 values to 1', () => {
    expect(clampPagination({ page: 2.7, limit: -3 })).toEqual({
      page: 2,
      limit: 1,
    });
  });

  it('rejects non-finite values back to safe bounds', () => {
    expect(clampPagination({ page: Number.NaN, limit: Infinity })).toEqual({
      page: 1,
      limit: 50,
    });
  });

  it('honours a custom ceiling', () => {
    expect(clampPagination({ limit: 100 }, { maxLimit: 30 })).toEqual({
      page: 1,
      limit: 30,
    });
  });

  it('honours a custom default limit', () => {
    expect(clampPagination({}, { defaultLimit: 9 })).toEqual({
      page: 1,
      limit: 9,
    });
  });

  it('caps an absurd page so `skip` stays a value Prisma accepts', () => {
    expect(clampPagination({ page: Infinity }).page).toBe(MAX_PAGE);
    expect(clampPagination({ page: 1e12 }).page).toBe(MAX_PAGE);
    expect(MAX_PAGE * 50).toBeLessThan(2_147_483_647);
  });

  it('honours a custom page ceiling', () => {
    expect(clampPagination({ page: 999 }, { maxPage: 10 }).page).toBe(10);
  });
});

describe('buildPaginatedMeta', () => {
  it('rounds a partial last page up', () => {
    expect(buildPaginatedMeta({ page: 1, limit: 10, totalCount: 25 })).toEqual({
      currentPage: 1,
      totalPages: 3,
      totalCount: 25,
      hasMore: true,
    });
  });

  it('reports no more pages on the last page', () => {
    expect(buildPaginatedMeta({ page: 3, limit: 10, totalCount: 25 }).hasMore).toBe(
      false
    );
  });

  it('handles an exactly-full last page', () => {
    const meta = buildPaginatedMeta({ page: 2, limit: 10, totalCount: 20 });
    expect(meta.totalPages).toBe(2);
    expect(meta.hasMore).toBe(false);
  });

  it('reports zero pages and no more results for an empty set', () => {
    expect(buildPaginatedMeta({ page: 1, limit: 10, totalCount: 0 })).toEqual({
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      hasMore: false,
    });
  });

  it('does not claim more pages when the page is past the end', () => {
    expect(
      buildPaginatedMeta({ page: 99, limit: 10, totalCount: 25 }).hasMore
    ).toBe(false);
  });
});
