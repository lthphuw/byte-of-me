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

/** What the raw FTS query returns — snake_case, straight off the table. */
interface FtsRow {
  id: string;
  title: string;
  updated_at: Date;
  snippet: string;
}

/**
 * Postgres full-text search over the generated `search_vector` column (see
 * the `add_note_search_vector` migration — this is the seam the old
 * `contains` implementation documented). `websearch_to_tsquery` gives
 * quoted-phrase and `-exclusion` syntax for free; `ts_headline` marks matches
 * with `<<`/`>>`, which the palette turns into `<mark>` — plain-text markers,
 * never HTML, so nothing here needs sanitising.
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

    const [rows, counts] = await Promise.all([
      prisma.$queryRaw<FtsRow[]>(Prisma.sql`
        SELECT
          "id",
          "title",
          "updated_at",
          ts_headline(
            'simple',
            "plain_text",
            websearch_to_tsquery('simple', ${query}),
            'MaxWords=30, MinWords=10, StartSel=<<, StopSel=>>'
          ) AS "snippet"
        FROM "notes"
        WHERE "owner_id" = ${session.id}
          AND "is_folder" = false
          ${archivedFilter}
          AND "search_vector" @@ websearch_to_tsquery('simple', ${query})
        ORDER BY
          ts_rank("search_vector", websearch_to_tsquery('simple', ${query})) DESC,
          "updated_at" DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT count(*)::bigint AS "count"
        FROM "notes"
        WHERE "owner_id" = ${session.id}
          AND "is_folder" = false
          ${archivedFilter}
          AND "search_vector" @@ websearch_to_tsquery('simple', ${query})
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
