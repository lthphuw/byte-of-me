'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type MoveShareExposureInput,
  moveShareExposureSchema,
} from '@/entities/note-share/model/note-share-schema';
import type { NoteShareExposure } from '@/entities/note-share/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** How many addresses the confirmation names before saying "and more". */
const LISTED_EMAIL_LIMIT = 5;

/**
 * Who would gain access if a note were moved under `parentId`.
 *
 * Seeded at the DESTINATION, not at the note being moved: the question is what
 * the new surroundings already expose, and the note's own current position is
 * irrelevant to that.
 *
 * This is what lets the explorer name the people before the owner commits.
 * `moveNote` repeats the check itself and refuses an unacknowledged move —
 * this one is convenience, that one is the boundary (AGENTS §5).
 */
export async function getMoveShareExposure(
  input: MoveShareExposureInput
): Promise<ApiResponse<NoteShareExposure>> {
  const session = await requireAdmin();

  const parsed = parseInput(moveShareExposureSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { parentId } = parsed.data;

  // The root level is not a note and can carry no grant, so there is nothing
  // to expose and no reason to pay for a round trip.
  if (parentId === null) {
    return { success: true, data: { shareCount: 0, emails: [] } };
  }

  try {
    const rows = await prisma.$queryRaw<{ email: string }[]>`
      WITH RECURSIVE chain AS (
        SELECT n.id, n.parent_id, n.owner_id
        FROM notes n
        WHERE n.id = ${parentId} AND n.owner_id = ${session.id}
        UNION ALL
        SELECT p.id, p.parent_id, p.owner_id
        FROM chain c
        JOIN notes p ON p.id = c.parent_id AND p.owner_id = c.owner_id
      )
      SELECT DISTINCT s.email
      FROM chain c
      JOIN note_shares s ON s.note_id = c.id
      ORDER BY s.email
    `;

    return {
      success: true,
      data: {
        shareCount: rows.length,
        emails: rows.slice(0, LISTED_EMAIL_LIMIT).map((row) => row.email),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to check the destination');
    logger.error(`Get move share exposure error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
