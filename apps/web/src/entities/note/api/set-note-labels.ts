'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type SetNoteLabelsInput,
  setNoteLabelsSchema,
} from '@/entities/note/model/note-schema';
import type { NoteLabelSummary } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Replaces a note's label set with `names` — creating any label that does not
 * exist yet, so "type a new tag and press Enter" is one call. Replace, not
 * merge: the caller sends the complete next set, which is the only semantics
 * that lets the same call also REMOVE a label.
 */
export async function setNoteLabels(
  input: SetNoteLabelsInput
): Promise<ApiResponse<NoteLabelSummary[]>> {
  const session = await requireAdmin();

  const parsed = parseInput(setNoteLabelsSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { noteId } = parsed.data;
  // Trim is the schema's; dedupe here so "a, a" cannot violate the unique
  // constraint mid-transaction.
  const names = [...new Set(parsed.data.names)];

  try {
    // Ownership gate BEFORE any write — the assignment delete below would
    // otherwise clear labels off someone else's note for a guessed id.
    const note = await prisma.note.findFirst({
      where: { id: noteId, ownerId: session.id },
      select: { id: true },
    });
    if (!note) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const labels = await prisma.$transaction(async (tx) => {
      // Two statements, not one `upsert` per name: the loop this replaces held
      // the transaction open for a round trip per label. `@@unique([ownerId,
      // name])` is both what makes `skipDuplicates` safe here and what serves
      // the read back.
      let ensured: NoteLabelSummary[] = [];
      if (names.length > 0) {
        await tx.noteLabel.createMany({
          data: names.map((name) => ({ ownerId: session.id, name })),
          skipDuplicates: true,
        });

        const rows = await tx.noteLabel.findMany({
          where: { ownerId: session.id, name: { in: names } },
          select: { id: true, name: true, color: true },
        });

        // Reordered to match `names`: the upsert loop returned the caller's
        // order, and the chips are rendered in the order they come back.
        const byName = new Map(rows.map((row) => [row.name, row]));
        ensured = names
          .map((name) => byName.get(name))
          .filter((row): row is NoteLabelSummary => row !== undefined);
      }

      // Rebuilt from the input, never diffed — same reasoning as the
      // document-link rebuild in `updateNote`.
      await tx.noteOnLabel.deleteMany({ where: { noteId } });
      if (ensured.length > 0) {
        await tx.noteOnLabel.createMany({
          data: ensured.map((label) => ({ noteId, labelId: label.id })),
          skipDuplicates: true,
        });
      }

      return ensured;
    });

    return { success: true, data: labels };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update labels');
    logger.error(`Set note labels error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
