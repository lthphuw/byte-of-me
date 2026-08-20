'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteDocumentSummary } from '@/entities/note-document/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One note's attachments, newest first — what the Files panel draws.
 *
 * `fileKey` is never selected. It is the object's address in a private bucket
 * and has no client use; the panel links through `noteDocumentHref(id)`, which
 * checks the session before it serves a byte.
 *
 * Ownership rides on `ownerId` inside the same query rather than being a check
 * the caller could be trusted to have already done, matching `getNoteShares`.
 * A note belonging to somebody else simply matches no rows — the response
 * cannot distinguish "no attachments" from "not your note", and deliberately
 * does not try: telling the difference would confirm the note exists.
 */
export async function getNoteDocuments(
  noteId: string
): Promise<ApiResponse<NoteDocumentSummary[]>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId, 'getNoteDocuments');
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const documents = await prisma.noteDocument.findMany({
      // `kind: 'ATTACHMENT'` is not a detail — it is what this list MEANS.
      // Inline images are `NoteDocument` rows too, so without it every
      // screenshot in the document shows up as an attachment and the panel
      // stops being a list of things the author attached. The index is
      // `(note_id, kind, created_at desc)`, so the filter is free.
      where: {
        noteId: parsedId.data,
        ownerId: session.id,
        kind: 'ATTACHMENT',
      },
      select: {
        id: true,
        title: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
      // The index this rides on is `[noteId, createdAt desc]`.
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: documents };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load attachments');
    logger.error(`Get note documents error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
