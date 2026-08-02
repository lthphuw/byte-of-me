'use server';

import { prisma } from '@byte-of-me/db';
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

/** How much of the body a result row shows. */
const SNIPPET_LENGTH = 180;

/**
 * `contains` rather than Postgres full-text search. A `tsvector` column needs
 * `Unsupported()` in the schema, a hand-written SQL migration and `$queryRaw`,
 * which forfeits type safety for a corpus that will not exceed a few thousand
 * rows. `plainText` is the seam: moving to FTS later means adding a generated
 * column and swapping this one query, with no change to the returned shape.
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
    const where = {
      ownerId: session.id,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { plainText: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
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
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to search notes');
    logger.error(`Search notes error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
