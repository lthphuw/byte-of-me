/**
 * The vocabulary every whole-vault maintenance job speaks.
 *
 * Two things stored on a note are DERIVED — `NoteLink` rows and
 * `Note.plainText` — and derived data drifts. A row written before a rule
 * changed, a document restored from an export, a save that failed between the
 * note write and the link rebuild: none of these announce themselves, and each
 * shows up much later as a missing edge in the graph or a note that search
 * cannot find. These jobs recompute the derivation from the document, which is
 * the only source of truth for it.
 *
 * They are CLIENT-DRIVEN BATCHES rather than a background worker: the panel
 * calls the action, gets a cursor back, and calls again. Each call does a
 * bounded amount of work and reports what it actually finished, so the progress
 * bar is measured rather than estimated — and nothing new has to exist to run
 * it. A job runner would need a queue, a place to keep job state, and a second
 * channel to report progress over; a vault of a few thousand notes does not
 * earn that.
 *
 * Nothing here imports anything, deliberately. These types cross the server
 * action boundary in both directions, so the client component driving the
 * progress bar has to be able to name them without pulling zod or Prisma into
 * the browser bundle (AGENTS §7).
 */

export interface BatchJobInput {
  /**
   * Id of the last note processed; omit or pass `null` to start.
   *
   * An id, and never an offset. The author is free to keep working while a job
   * runs, and `skip: n` numbers rows in a result set that is recomputed from
   * scratch on every call: one note created ahead of the cursor shifts every
   * later row down one, so the next page re-reads a note already done; one note
   * deleted shifts them up, so the next page steps straight over a note that
   * then never gets rebuilt. Neither is visible from outside — the job reports
   * "complete" having silently skipped a document whose links or search text
   * stay wrong until somebody notices an edge missing from the graph. A cursor
   * on the primary key names a position in the DATA, so rows either side of it
   * can come and go without moving it.
   */
  cursor?: string | null;
  /** Notes per call. Clamped server-side by `clampBatchLimit`. */
  limit?: number;
}

export interface BatchJobProgress {
  /** Total notes in scope — stable across calls so a progress bar is honest. */
  total: number;
  /** Notes examined by THIS call. */
  processed: number;
  /** Notes actually changed by THIS call. */
  changed: number;
  /** Pass back as `cursor`; `null` means the job is finished. */
  nextCursor: string | null;
}

/**
 * Notes per call when the caller does not say.
 *
 * Small on purpose. The bound that matters is not the database's — it is that a
 * server action has to answer inside one request, and that the progress bar
 * only moves when a call returns. A batch of 500 would finish the whole vault
 * in three calls and show the author a bar that sits still and then jumps,
 * which is the thing this design exists to avoid.
 */
export const BATCH_JOB_LIMIT = 25;

/**
 * The ceiling, whatever the caller asks for. `limit` arrives over an
 * addressable endpoint, so it can be any number at all; without a clamp one
 * request could ask a rebuild to hold the whole corpus and every note's links
 * in memory at once.
 */
export const BATCH_JOB_MAX_LIMIT = 100;

/**
 * Normalise a caller-supplied page size.
 *
 * An out-of-range page size is not a bad request — it is a progress bar asking
 * for more work than it should get — so it is corrected rather than rejected,
 * the way `getNotesPage` corrects its own. Anything unusable (absent, `NaN`,
 * `Infinity`, zero, negative) falls back to the default instead of reaching
 * Prisma as a `take` it cannot use.
 */
export function clampBatchLimit(limit?: number): number {
  const requested = Math.floor(limit ?? BATCH_JOB_LIMIT);
  if (!Number.isFinite(requested) || requested < 1) return BATCH_JOB_LIMIT;
  return Math.min(requested, BATCH_JOB_MAX_LIMIT);
}

/** The `where` every maintenance job pages over. */
export interface NoteBatchScope {
  ownerId: string;
  isFolder: false;
}

/**
 * What "the whole vault" means to these jobs: every DOCUMENT the caller owns.
 *
 * Folders are out because a folder has no document of its own — `createNote`
 * gives it the empty doc and an empty `plainText`, and `isFolder` is never
 * toggled afterwards — so it can neither hold a link nor have search text to
 * recompute. Counting them would only make the progress bar lie about how much
 * work there is.
 *
 * Archived notes are IN, and that is the less obvious half. The reads filter
 * the bin out (`getNoteGraph`, `getSpaceStats`), so it is tempting to skip it
 * here too — but the rows themselves survive archiving, and search still offers
 * `includeArchived`. Skipping archived notes would leave exactly the notes
 * nobody is looking at as the ones whose derived data can never be repaired,
 * and restoring one would put its stale edges straight back into the graph.
 */
export function noteBatchScope(ownerId: string): NoteBatchScope {
  return { ownerId, isFolder: false };
}
