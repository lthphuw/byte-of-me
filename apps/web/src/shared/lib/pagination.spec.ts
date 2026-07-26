import { buildPaginatedMeta } from './pagination';

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
