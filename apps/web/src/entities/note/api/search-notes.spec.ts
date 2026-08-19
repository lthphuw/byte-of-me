/**
 * Search is the only read that touches `plainText`/`search_vector`. What must
 * hold: the raw FTS statements are owner-scoped and parameter-bound (never
 * string-interpolated), archived notes stay out unless asked for, pagination
 * is clamped, and the empty query is a recents list rather than a search.
 */
import type { Prisma } from '@byte-of-me/db';
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as SearchNotesModule from './search-notes';

let searchNotes: typeof SearchNotesModule.searchNotes;

beforeAll(async () => {
  ({ searchNotes } = await import('./search-notes'));
});

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const ftsRow = {
  id: 'note-1',
  title: 'Kafka',
  updated_at: new Date('2026-08-01T00:00:00.000Z'),
  snippet: 'consumer group <<rebalance>> protocol',
};

/**
 * One mock serves both statements of the FTS path; which one a call is comes
 * off the statement's own text (`count(*)`), the same way Postgres would see
 * it. `Prisma.Sql#sql` is the parameterised text, `#values` the bound params.
 */
const queryRaw = mock((sql: InstanceType<typeof Prisma.Sql>) =>
  sql.sql.includes('count(*)')
    ? Promise.resolve([{ count: BigInt(1) }])
    : Promise.resolve([ftsRow])
);
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

/** Every `Prisma.Sql` the action sent this test, in call order. */
function sentStatements(): InstanceType<typeof Prisma.Sql>[] {
  return queryRaw.mock.calls.map(
    (call) => call[0] as InstanceType<typeof Prisma.Sql>
  );
}

describe('searchNotes', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      {
        id: 'note-1',
        title: 'Kafka',
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        plainText: 'consumer group rebalance protocol',
      },
    ]);
    count.mockReset().mockResolvedValue(1);
    queryRaw.mockClear();
  });

  it('returns highlighted snippets in a PaginatedData envelope', async () => {
    const res = await searchNotes({
      query: 'rebalance',
      includeArchived: false,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.data[0]?.snippet).toBe(
      'consumer group <<rebalance>> protocol'
    );
    expect(res.data.data[0]?.updatedAt).toEqual(ftsRow.updated_at);
    expect(res.data.meta.totalCount).toBe(1);
  });

  it('binds owner and query as parameters in BOTH statements', async () => {
    await searchNotes({ query: 'rebalance', includeArchived: false });

    const statements = sentStatements();
    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      expect(statement.sql).toContain('"owner_id" ='); // scoped…
      expect(statement.values).toContain('admin-1'); // …by a bound param
      expect(statement.values).toContain('rebalance');
      // The raw text must never carry the user's query inline.
      expect(statement.sql).not.toContain('rebalance');
    }
  });

  it('matches the trailing term as a PREFIX, so typing finds something', async () => {
    // `zebr`, not `archi`: the latter is a substring of `"archived_at"`, so
    // the "never inlined" assertion below would fail on the filter clause
    // rather than on anything this test is about.
    await searchNotes({ query: 'zebr', includeArchived: false });

    for (const statement of sentStatements()) {
      // The rewrite runs on `websearch_to_tsquery`'s OUTPUT, never on the
      // author's text — which is what keeps `to_tsquery` (it throws on
      // malformed input; `websearch_to_tsquery` never does) safe to use here.
      expect(statement.sql).toContain('websearch_to_tsquery');
      expect(statement.sql).toContain("':*'");
      expect(statement.sql).toContain('regexp_replace');
      // Still a bound parameter, never inlined.
      expect(statement.values).toContain('zebr');
      expect(statement.sql).not.toContain('zebr');
    }
  });

  it('leaves a NEGATED trailing term alone', async () => {
    await searchNotes({ query: 'notes -archived', includeArchived: false });

    for (const statement of sentStatements()) {
      // The negative lookbehind is the whole point: without it
      // `!'archived'` becomes `!'archived':*` and the query silently
      // excludes every note containing "architecture" too — a narrow
      // exclusion widened into one the author never wrote.
      expect(statement.sql).toContain('(?<!!)');
      expect(statement.values).toContain('notes -archived');
    }
  });

  it('caps the reported total instead of counting every match', async () => {
    await searchNotes({ query: 'x', includeArchived: false });

    const [, count] = sentStatements();
    // An exact count visits every matching row: measured at 50k notes, 843ms
    // for a term in every row versus 4.1ms capped, while the index lookup
    // itself stayed at 0.1ms. The inner LIMIT is what bounds the walk.
    expect(count.sql).toContain('count(*)');
    expect(count.values).toContain(1000);
  });

  it('excludes archived notes by default, includes them when asked', async () => {
    await searchNotes({ query: 'x', includeArchived: false });
    for (const statement of sentStatements()) {
      expect(statement.sql).toContain('"archived_at" IS NULL');
    }

    queryRaw.mockClear();
    await searchNotes({ query: 'x', includeArchived: true });
    for (const statement of sentStatements()) {
      expect(statement.sql).not.toContain('"archived_at" IS NULL');
    }
  });

  it('clamps out-of-range pagination before it reaches the database', async () => {
    await searchNotes({
      query: 'x',
      includeArchived: false,
      page: 0,
      limit: 1_000_000,
    });

    const [rowsStatement] = sentStatements();
    // clampPagination caps limit at 50 and floors page at 1 → OFFSET 0.
    expect(rowsStatement?.values).toContain(50);
    expect(rowsStatement?.values).toContain(0);
  });

  it('treats an empty query as "recent notes" rather than a search', async () => {
    queryRaw.mockImplementationOnce(() =>
      Promise.resolve([
        {
          id: 'note-1',
          title: 'Kafka',
          updated_at: new Date('2026-08-01T00:00:00.000Z'),
          snippet: 'consumer group rebalance protocol',
        },
      ])
    );

    const res = await searchNotes({ query: '', includeArchived: false });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');

    // One statement, not two: no `count(*)` companion. Both halves used to be
    // full owner scans on the palette's first, still-empty open.
    const statements = sentStatements();
    expect(statements).toHaveLength(1);

    const [recents] = statements;
    // Recency, not relevance — none of the FTS machinery may appear.
    expect(recents?.sql).not.toContain('websearch_to_tsquery');
    expect(recents?.sql).not.toContain('ts_rank');
    expect(recents?.sql).toContain('ORDER BY "updated_at" DESC');
    // Owner scope and the body cap travel as bound params, never interpolated.
    expect(recents?.sql).toContain('left("plain_text"');
    expect(recents?.values).toContain('admin-1');
    // A folder has no document, so it is not a "recent note".
    expect(recents?.sql).toContain('"is_folder" = false');
    expect(recents?.sql).toContain('"archived_at" IS NULL');

    // Recents carry a plain head-of-document snippet, no highlight markers.
    expect(res.data.data[0]?.snippet).toBe(
      'consumer group rebalance protocol'
    );
  });

  // Pins the contract `buildPaginatedMeta` already documents and tests:
  // zero results means zero pages, not one.
  it('reports totalPages: 0 for an empty result set', async () => {
    queryRaw.mockImplementationOnce(() => Promise.resolve([]));
    queryRaw.mockImplementationOnce(() =>
      Promise.resolve([{ count: BigInt(0) }])
    );

    const res = await searchNotes({ query: 'nothing', includeArchived: false });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.meta.totalPages).toBe(0);
  });
});
