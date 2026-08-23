'use client';

/**
 * Sets logged on the gym floor that the server has not accepted yet.
 *
 * A phone in a basement gym has a bad signal, not no signal, and the failure
 * that matters is the slow one: the set was performed, the button was pressed,
 * the request never arrived. Holding it only in the query cache would lose it
 * to a reload, a background tab the OS discards, or the walk to the car. This
 * is the durable half — the set survives the page.
 *
 * IndexedDB rather than `localStorage`, for the reasons
 * `entities/note/model/note-local-store.ts` sets out at length: `localStorage`
 * is synchronous and blocks the main thread, and this write happens on the tap
 * that has to feel instant. No dependency was added (AGENTS §11.1); the access
 * pattern is one store, appended to and drained.
 *
 * **A SEPARATE database from the notes one**, and that is not an oversight.
 * `byte-of-me` is at version 1 and its store list is owned by the note entity;
 * adding a store here would mean opening the same name at version 2, and any
 * tab still holding the version-1 connection blocks that upgrade — the notes
 * editor and the gym logger would take turns failing to open depending on
 * which loaded first. Two names, two versions, no shared upgrade path.
 *
 * Everything below FAILS SOFT. A private window that refuses to open a
 * database, a quota that runs out mid-write, a browser with IndexedDB disabled:
 * each resolves to `null`, to `[]`, or to nothing at all, never to a rejected
 * promise. The queue is a safety net, and a safety net that can throw is one
 * more thing to catch mid-set.
 */

import type { SetPayload } from './set-drafts';

import type { WorkoutSessionDetail } from '@/entities/workout';

const DB_NAME = 'byte-of-me-gym';
const DB_VERSION = 1;
const PENDING_STORE = 'pending-sets';
const SESSION_INDEX = 'sessionId';

/** One unsent set. */
export interface PendingSet {
  /**
   * The id the optimistic row carries in the query cache, so the record and
   * what is on screen are the same thing rather than two things that have to be
   * matched up. Locally generated and prefixed, because it shares a field with
   * server cuids and the two must never be confused: a delete or an update
   * addressed to a local id would 404, and one addressed to a server id that
   * came from here would hit somebody's row.
   */
  id: string;
  /** What the queue is keyed by: a drain is per session, and a set from
   *  yesterday's workout must not be replayed into today's. */
  sessionId: string;
  workoutExerciseId: string;
  payload: SetPayload;
  /** When the set was queued, so a drain replays in the order performed. */
  queuedAt: number;
}

export const LOCAL_SET_ID_PREFIX = 'local:';

/** True for an id this module minted, rather than one a server returned. */
export function isLocalSetId(id: string): boolean {
  return id.startsWith(LOCAL_SET_ID_PREFIX);
}

/** A fresh local id. `crypto.randomUUID` is available in every browser this
 *  app supports and, unlike a counter, survives two tabs logging at once. */
export function newLocalSetId(): string {
  return `${LOCAL_SET_ID_PREFIX}${crypto.randomUUID()}`;
}

/**
 * The open database, opened at most once per page.
 *
 * Cached as the PROMISE rather than the result so concurrent callers share one
 * request. A failed open resolves `null` and stays cached that way: a browser
 * that refuses once will refuse again, and retrying per set would be a
 * stampede against a door that does not open.
 */
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    // `typeof` rather than a truthiness check: this module is reached from
    // client components that Next also renders on the server, where the
    // identifier does not exist at all and referencing it would throw.
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const store = db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
          // The drain reads one session's queue, never the whole store. An
          // index rather than a cursor over everything: the record set is
          // small, but a filter that scans is a filter that gets slower
          // exactly as the queue gets longer, which is the case it exists for.
          store.createIndex(SESSION_INDEX, 'sessionId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      // Another tab holds a connection at an older version. Resolve rather
      // than hang: the logger must never wait on a database.
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Runs one transaction and resolves when it COMMITS, not when the request
 * succeeds.
 *
 * The distinction is the whole point for a write: a request can succeed and
 * its transaction still abort (quota, a concurrent version change), and a
 * caller that told the reader "queued" on the request would have promised
 * durability it did not get.
 */
function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }

        try {
          const transaction = db.transaction(PENDING_STORE, mode);
          const request = work(transaction.objectStore(PENDING_STORE));

          transaction.oncomplete = () => resolve(request.result ?? null);
          transaction.onerror = () => resolve(null);
          transaction.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

/** Stores one unsent set. Resolves `true` only when the transaction committed
 *  — the caller shows an "unsynced" count off the back of it, and a count that
 *  claims a record nothing wrote is worse than no count. */
export function queuePendingSet(pending: PendingSet): Promise<boolean> {
  return runTransaction('readwrite', (store) => store.put(pending)).then(
    (result) => result !== null
  );
}

/** Forgets one queued set — what a successful replay leaves behind. */
export function deletePendingSet(id: string): Promise<void> {
  return runTransaction('readwrite', (store) => store.delete(id)).then(
    () => undefined
  );
}

/**
 * One session's unsent sets, oldest first.
 *
 * The order is the order they were performed, and it is load-bearing:
 * `addWorkoutSet` derives `position` from the current set count, so replaying
 * out of order would renumber the workout — set 3 arriving before set 2 lands
 * as set 2 and the two swap in every later reading of the session.
 */
export function listPendingSets(sessionId: string): Promise<PendingSet[]> {
  return runTransaction<PendingSet[]>('readonly', (store) =>
    store.index(SESSION_INDEX).getAll(sessionId)
  ).then((rows) =>
    (rows ?? []).slice().sort((a, b) => a.queuedAt - b.queuedAt)
  );
}

/**
 * The session as it should be READ: what the server has, plus what this
 * browser is still holding.
 *
 * Pure, and here rather than in the hook that calls it, because it is the
 * other half of what a queued set means — a record on disk that nothing puts
 * back on screen is a record nobody knows about.
 *
 * Without it a refetch of the session (a reconnect, a remount, the sixty
 * second stale time expiring) answers with the rows the server knows about,
 * which by definition excludes every queued set — and sets the reader logged
 * would disappear from the list while the header still counted them as
 * unsynced.
 *
 * Deduplicated by id: the optimistic row already in the query cache and the
 * queued record are the same set under the same local id, so in the common
 * case this adds nothing and returns the session untouched.
 */
export function mergePendingSets(
  session: WorkoutSessionDetail,
  pending: PendingSet[]
): WorkoutSessionDetail {
  if (pending.length === 0) return session;

  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      const known = new Set(exercise.sets.map((set) => set.id));
      const missing = pending
        .filter(
          (record) =>
            record.workoutExerciseId === exercise.id && !known.has(record.id)
        )
        .sort((a, b) => a.queuedAt - b.queuedAt);

      if (missing.length === 0) return exercise;

      return {
        ...exercise,
        sets: [
          ...exercise.sets,
          ...missing.map((record, index) => ({
            id: record.id,
            position: exercise.sets.length + index,
            ...record.payload,
          })),
        ],
      };
    }),
  };
}

/**
 * Drops the cached connection. Tests only — a spec that swaps the global
 * `indexedDB` needs the next call to open against the new one rather than
 * reuse a handle to the old.
 */
export function __resetPendingSetStore(): void {
  dbPromise = null;
}
