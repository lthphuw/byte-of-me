'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteShareExposure } from '@/entities/note-share/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** How many addresses the confirmation dialogs name before saying "and more". */
const LISTED_EMAIL_LIMIT = 5;

/**
 * Who can currently reach this note — through a grant on it, or on anything
 * above it.
 *
 * The upward walk is what makes the answer honest. A note inside a shared
 * folder carries no grant of its own, so counting only its own rows would
 * report "shared with nobody" for a note several people are reading, in a
 * confirmation dialog whose whole job is to say what is about to be lost.
 */
export async function getNoteShareExposure(
  noteId: string
): Promise<ApiResponse<NoteShareExposure>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    // Owner scoping is inside the walk, on every level, for the reason
    // `getNoteAncestors` records: the seed only resolves for a note this owner
    // holds, and each step climbs through `AND p.owner_id`, so the walk stops
    // at the first row they do not hold instead of climbing past it.
    const rows = await prisma.$queryRaw<{ email: string }[]>`
      WITH RECURSIVE chain AS (
        SELECT n.id, n.parent_id, n.owner_id
        FROM notes n
        WHERE n.id = ${parsedId.data} AND n.owner_id = ${session.id}
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
        // The TRUE total, never the length of the list below: understating who
        // loses access on a destructive path is the wrong direction to be
        // wrong in.
        shareCount: rows.length,
        emails: rows.slice(0, LISTED_EMAIL_LIMIT).map((row) => row.email),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to check who has access');
    logger.error(`Get note share exposure error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
