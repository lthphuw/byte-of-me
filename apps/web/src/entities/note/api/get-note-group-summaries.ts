'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  NO_LABEL_GROUP_KEY,
  type NoteGroupSummary,
} from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export interface GetNoteGroupSummariesInput {
  groupBy: 'status' | 'label';
  includeArchived?: boolean;
}

/**
 * The grouped explorer's section headers: every bucket, with its TRUE size,
 * and not one row.
 *
 * This is a separate query from `getNotesInGroup` on purpose. The rows inside
 * a section are cursor-paginated, so a header derived from the loaded rows
 * would read "100" under a bucket holding 3000 and would keep changing as the
 * reader scrolled — the counts have to come from an aggregate that never
 * paginates. The client-side `groupRows` it replaces could only count
 * correctly because it was handed the whole corpus, which is the read this
 * work exists to remove.
 *
 * Bucketing semantics are `groupRows`': one bucket per distinct status, or one
 * per label that HAS notes (a note wearing two labels is counted in both,
 * hence the count through the join rather than on the note), plus a final
 * bucket for notes with no labels at all.
 */
export async function getNoteGroupSummaries(
  input: GetNoteGroupSummariesInput
): Promise<ApiResponse<NoteGroupSummary[]>> {
  const session = await requireAdmin();

  // The same filter `getNotesInGroup` applies. If these two ever drift, a
  // header promises rows its own section will not show.
  const noteWhere = {
    ownerId: session.id,
    // Folders are containers; the grouped view lists documents.
    isFolder: false,
    ...(input.includeArchived ? {} : { archivedAt: null }),
  };

  try {
    if (input.groupBy === 'status') {
      const buckets = await prisma.note.groupBy({
        by: ['status'],
        where: noteWhere,
        _count: { _all: true },
        // Alphabetical rather than `groupRows`' first-seen row order: with the
        // rows no longer loaded there is no "first seen", and a stable order
        // stops sections jumping around between refetches.
        orderBy: { status: 'asc' },
      });

      return {
        success: true,
        data: buckets.map((bucket) => ({
          // The prefix is what lets `getNotesInGroup` find where the value
          // starts — a status is free-form and may contain anything.
          key: `status:${bucket.status}`,
          title: bucket.status,
          count: bucket._count._all,
        })),
      };
    }

    const [labels, noLabelCount] = await Promise.all([
      prisma.noteLabel.findMany({
        where: { ownerId: session.id },
        select: {
          id: true,
          name: true,
          // A filtered relation count: NoteOnLabel rows for this label whose
          // note passes the same filter as the row query. Counting the notes
          // directly would miss that one note belongs to several buckets.
          _count: { select: { notes: { where: { note: noteWhere } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.note.count({
        // "No join rows" is the definition of unlabeled; `labelIds.length`
        // cannot be asked of the database.
        where: { ...noteWhere, labels: { none: {} } },
      }),
    ]);

    const summaries: NoteGroupSummary[] = labels
      // An empty section is noise, and `groupRows` did not emit one either.
      .filter((label) => label._count.notes > 0)
      .map((label) => ({
        key: `label:${label.id}`,
        title: label.name,
        labelId: label.id,
        count: label._count.notes,
      }));

    if (noLabelCount > 0) {
      summaries.push({
        key: NO_LABEL_GROUP_KEY,
        // The key token, not English prose — the caller localizes it.
        title: NO_LABEL_GROUP_KEY,
        count: noLabelCount,
      });
    }

    return { success: true, data: summaries };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note groups');
    logger.error(`Get note group summaries error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
