'use server';

import { Prisma,prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type SearchNotesInput,
  searchNotesSchema,
} from '@/entities/note/model/note-schema';
import type { NoteSearchHit } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

/** How much of the body a result row shows (empty-query path only). */
const SNIPPET_LENGTH = 180;

/**
 * Ceiling on the reported match total.
 *
 * An exact `count(*)` has to visit every matching row, which is the one part
 * of this search that does not scale: measured on 50k synthetic notes, a term
 * present in every row cost 843ms to count and 4.1ms to count capped — the
 * index lookup itself stayed at 0.1ms throughout. Nothing reads `meta` today
 * (the palette asks for page 1 and renders the rows), so the cap is currently
 * invisible; it exists so that a future paginated search cannot turn one
 * keystroke into a full-corpus scan. A caller that hits the cap should read it
 * as "at least this many".
 */
const COUNT_CAP = 1000;

/**
 * The query, as Postgres sees it — with the LAST term turned into a prefix.
 *
 * `websearch_to_tsquery` does the parsing, so quoted phrases and `-exclusion`
 * keep working exactly as before; this only rewrites its OUTPUT. That
 * distinction is what makes the rewrite safe: `to_tsquery` throws on malformed
 * input where `websearch_to_tsquery` never does (verified on `a & | b`, `!!!`,
 * `:*`, `'` and `((`), but what reaches it here is a well-formed tsquery this
 * function produced, not anything the author typed.
 *
 * The negative lookbehind is load-bearing. Without it `notes -archived`
 * becomes `'notes' & !'archived':*`, which excludes every note containing
 * *architecture* as well — a silent widening of a negation the author wrote
 * narrowly. With it, only a trailing POSITIVE term is prefixed:
 *
 *   archi              -> 'archi':*
 *   server acti        -> 'server' & 'acti':*
 *   "trust boundary"   -> 'trust' <-> 'boundary':*
 *   notes -archived    -> 'notes' & !'archived'        (unchanged)
 *   caching -old lay   -> 'caching' & !'old' & 'lay':*
 *
 * The `CASE` guards the one input that would still throw: a query of pure
 * punctuation parses to an EMPTY tsquery, and `to_tsquery('')` raises "no
 * operand". An empty tsquery matches nothing, which is the right answer for
 * that input anyway.
 */
function tsQuery(query: string) {
  return Prisma.sql`
    CASE
      WHEN websearch_to_tsquery('simple', ${query})::text = ''
        THEN websearch_to_tsquery('simple', ${query})
      ELSE to_tsquery(
        'simple',
        regexp_replace(
          websearch_to_tsquery('simple', ${query})::text,
          '(?<!!)''([^'']+)''$',
          '''\\1'':*'
        )
      )
    END`;
}

/** What the raw FTS query returns — snake_case, straight off the table. */
interface FtsRow {
  id: string;
  title: string;
  updated_at: Date;
  snippet: string;
}

/**
 * Postgres full-text search over the generated `search_vector` column (see
 * the `add_note_search_vector` and `widen_note_search_vector` migrations —
 * this is the seam the old `contains` implementation documented).
 * `websearch_to_tsquery` gives quoted-phrase and `-exclusion` syntax for
 * free; `ts_headline` marks matches with `<<`/`>>`, which the palette turns
 * into `<mark>` — plain-text markers, never HTML, so nothing here needs
 * sanitising.
 *
 * The trailing term is matched as a PREFIX, so the palette finds something
 * while the author is still typing the word — see `tsQuery`. The match total
 * is capped — see `COUNT_CAP`.
 *
 * The EMPTY query keeps the old findMany path: it is "list recent notes", not
 * a search, and `websearch_to_tsquery('')` would match nothing.
 */
export async function searchNotes(
  input: SearchNotesInput
): Promise<ApiResponse<PaginatedData<NoteSearchHit>>> {
  const session = await requireAdmin();

  const parsed = parseInput(searchNotesSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { query, includeArchived } = parsed.data;

  // Server actions are addressable endpoints: page/limit arrive
  // caller-controlled and must be bounded before they reach Prisma.
  const { page, limit } = clampPagination({
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  try {
    if (!query) {
      const where = {
        ownerId: session.id,
        // Folders have no document; listing them as "recent notes" is noise.
        isFolder: false,
        ...(includeArchived ? {} : { archivedAt: null }),
      };

      const [rows, totalCount] = await Promise.all([
        prisma.note.findMany({
          where,
          select: {
            id: true,
            title: true,
            updatedAt: true,
            plainText: true,
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.note.count({ where }),
      ]);

      return {
        success: true,
        data: {
          data: rows.map((row) => ({
            id: row.id,
            title: row.title,
            updatedAt: row.updatedAt,
            snippet: row.plainText.slice(0, SNIPPET_LENGTH),
          })),
          meta: buildPaginatedMeta({ page, limit, totalCount }),
        },
      };
    }

    // Owner scoping lives INSIDE both statements — the raw path must not be
    // weaker than the Prisma one. Parameters are bound (`${}` in Prisma.sql
    // becomes a placeholder), never interpolated.
    const archivedFilter = includeArchived
      ? Prisma.empty
      : Prisma.sql`AND "archived_at" IS NULL`;

    // Built once and reused by both statements. A CTE rather than repeating
    // the expression: `websearch_to_tsquery` would otherwise be parsed four
    // times per search, and the two statements could not drift apart.
    const tsq = tsQuery(query);

    const [rows, counts] = await Promise.all([
      prisma.$queryRaw<FtsRow[]>(Prisma.sql`
        WITH q AS (SELECT ${tsq} AS "tsq")
        SELECT
          "id",
          "title",
          "updated_at",
          ts_headline(
            'simple',
            "plain_text",
            q."tsq",
            'MaxWords=30, MinWords=10, StartSel=<<, StopSel=>>'
          ) AS "snippet"
        FROM "notes", q
        WHERE "owner_id" = ${session.id}
          AND "is_folder" = false
          ${archivedFilter}
          AND "search_vector" @@ q."tsq"
        ORDER BY
          ts_rank("search_vector", q."tsq") DESC,
          "updated_at" DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `),
      // Capped, deliberately — see `COUNT_CAP`. The inner `LIMIT` is what
      // bounds the work: Postgres stops walking the index once it has that
      // many matches instead of visiting every one.
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        WITH q AS (SELECT ${tsq} AS "tsq")
        SELECT count(*)::bigint AS "count" FROM (
          SELECT 1
          FROM "notes", q
          WHERE "owner_id" = ${session.id}
            AND "is_folder" = false
            ${archivedFilter}
            AND "search_vector" @@ q."tsq"
          LIMIT ${COUNT_CAP}
        ) AS "capped"
      `),
    ]);

    const totalCount = Number(counts[0]?.count ?? 0);

    return {
      success: true,
      data: {
        data: rows.map((row) => ({
          id: row.id,
          title: row.title,
          updatedAt: row.updated_at,
          snippet: row.snippet,
        })),
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to search notes');
    logger.error(`Search notes error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
