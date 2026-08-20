'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { collectDescendantIds } from '@/entities/note/model/note-tree';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Hard delete. Descendants, links and label joins go with it through the
 * database cascade — the caller is responsible for having confirmed the exact
 * descendant count with the author first.
 *
 * Returns the ids it deleted, target first, exactly as `archiveNote` does and
 * for the same reason: the cascade is knowable here and nowhere else. A
 * collapsed folder's subtree was never fetched by the browser, so the caller
 * cannot name the notes a folder delete just destroyed — and it needs to. The
 * editor may be open on a DESCENDANT rather than on the row that was clicked,
 * and comparing against the target id alone left it sitting on a note that no
 * longer exists, still autosaving into it: an `updateNote` against a row the
 * server has permanently dropped, answered with a red "Failed to save" one
 * beat after "Note deleted". See `hasNoteBeenDeleted`.
 *
 * The ids are collected BEFORE the write — two sequential awaits, so the read
 * cannot see rows the delete has already removed. No transaction: the walk is
 * only how the ids are REPORTED, never how they are destroyed. `Note.parent`
 * is `onDelete: Cascade`, so the database still takes the whole subtree on its
 * own, including any row created under it after this read — listing the ids
 * explicitly in the `where` cannot delete less than the target alone would,
 * and cannot reach outside this owner's rows either.
 *
 * Attachment OBJECTS are the one thing the cascade cannot take: it removes
 * every `NoteDocument` row under the subtree and leaves the files themselves
 * sitting in the private bucket, unreferenced and unreachable. So their keys
 * are read alongside the ids, and the objects are removed after the write.
 *
 * Widening `data` from `null` costs no existing caller anything (AGENTS
 * §11.6); the envelope is unchanged.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function deleteNote(id: string): Promise<ApiResponse<string[]>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const rows = await prisma.note.findMany({
      where: { ownerId: session.id },
      select: { id: true, parentId: true },
    });

    // The write below targets the note *and* its descendants, so its `count`
    // is never a reliable "did the target exist" signal. `rows` is owner-
    // scoped and already holds every note this owner has, so membership here
    // answers it off the same fetch — and answers it identically for "no such
    // note" and "belongs to another owner", which is the property the old
    // `count === 0` check had and which `moveNote` also keeps. Neither case
    // may be inferable from the response.
    if (!rows.some((row) => row.id === parsedId.data)) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const ids = [parsedId.data, ...collectDescendantIds(rows, parsedId.data)];

    // Read the attachments' storage keys BEFORE the write, for the same
    // reason the ids are read first: `NoteDocument.noteId` is
    // `onDelete: Cascade`, so the database takes the ROWS with the subtree
    // and after that nothing in this process can still say which objects
    // they pointed at. The bucket has no cascade.
    const documents = await prisma.noteDocument.findMany({
      where: { noteId: { in: ids }, ownerId: session.id },
      select: { fileKey: true },
    });

    // `ownerId` stays on the write even though every id above came from an
    // owner-scoped read. It is the security boundary, not a filter that has
    // become redundant — the walk is client-shaped logic and the guard must
    // not depend on it being correct.
    await prisma.note.deleteMany({
      where: { id: { in: ids }, ownerId: session.id },
    });

    // Rows first, objects after — and a failed object delete is logged, not
    // propagated. The row is already gone, so the caller's delete DID
    // succeed; an object nobody can reach any more is a storage bill, not a
    // correctness bug, and failing the action here would tell the author
    // their note survived when it did not. `allSettled` so one key's failure
    // does not abandon the rest.
    if (documents.length > 0) {
      const results = await Promise.allSettled(
        documents.map((document) => privateStorage.deleteFile(document.fileKey))
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(
            `Delete note: orphaned attachment object ${
              documents[index]?.fileKey
            }: ${getErrorMessage(result.reason, 'unknown error')}`
          );
        }
      });
    }

    return { success: true, data: ids };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete note');
    logger.error(`Delete note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
