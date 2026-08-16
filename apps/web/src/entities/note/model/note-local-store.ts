'use client';

/**
 * The browser's copy of the author's notes — this app's answer to Obsidian's
 * folder of Markdown files.
 *
 * IndexedDB rather than `localStorage`, and the choice is not stylistic.
 * `localStorage` is SYNCHRONOUS: every read and every write blocks the main
 * thread, which is the one thing a "make typing smooth" change cannot afford.
 * It also caps at roughly 5MB per origin and stores strings only. A Tiptap
 * document serialises to three to ten times the size of its prose, so a few
 * dozen long notes fill that budget, and the failure mode is a
 * `QuotaExceededError` thrown in the middle of a save. IndexedDB is
 * asynchronous, holds orders of magnitude more, and stores structured values.
 * `localStorage` stays what it already is here — small preferences
 * (`byte-of-me:notes-explorer`, `byte-of-me:notes-sidebar`).
 *
 * Everything below FAILS SOFT. A browser with IndexedDB disabled, a private
 * window that refuses to open a database, a quota that runs out mid-write:
 * each resolves to `null` or to nothing at all, never to a rejected promise.
 * The local copy is an accelerator and a safety net, and neither is worth
 * taking the editor down for — the server remains the system of record.
 *
 * No dependency was added for this (AGENTS §11.1). The wrapper is small
 * because the access pattern is: one object store, keyed by note id, read and
 * written whole.
 *
 * It lives in the note ENTITY rather than in `shared/lib` because it knows
 * what a note is — it stores `NoteDetail`, so priming the query cache from it
 * is a typed assignment rather than a reconstruction. A generic IndexedDB
 * helper in `shared/` with a note-shaped wrapper on top would be two modules
 * where the access pattern needs one (AGENTS §11.3).
 */

import type { NoteDetail } from '@/entities/note/model/types';

const DB_NAME = 'byte-of-me';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';

/** A note as the browser currently holds it. */
export interface LocalNote {
  id: string;
  /**
   * The whole server row as this browser last knew it, with any unsent local
   * edits already applied to `title`/`content`.
   *
   * The FULL `NoteDetail`, not just the two fields that get edited, so that
   * opening a note can seed `noteKeys.detail(id)` with a complete, correctly
   * typed record and the editor can paint from it without waiting for the
   * network. Storing only title and content would mean inventing the other
   * ten fields at read time — and `NoteDetail` is what every consumer of that
   * cache key already expects. IndexedDB stores it by structured clone, so
   * the `Date` fields survive as `Date`s rather than as strings.
   */
  detail: NoteDetail;
  /**
   * `updatedAt` (epoch ms) of the SERVER row this copy was built from — the
   * common ancestor, not the time of the local edit.
   *
   * This is what makes divergence detectable. When the server reports an
   * `updatedAt` newer than this, some other device has written since this copy
   * was taken, and `dirty` then decides whether that is a silent catch-up or a
   * conflict the author has to settle.
   */
  baseUpdatedAt: number;
  /** True while this copy holds edits the server has not acknowledged. */
  dirty: boolean;
  /** When this copy was last written locally. Shown in the conflict banner. */
  savedAt: number;
}

/**
 * The open database, opened at most once per page.
 *
 * Cached as the PROMISE rather than the result, so concurrent callers during
 * the open share one request instead of racing to create several. A failed
 * open resolves to `null` and stays cached that way: a browser that refuses
 * once will refuse again, and retrying per keystroke would be a stampede
 * against a door that does not open.
 */
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    // `typeof` rather than a truthiness check: this module is imported by
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
        if (!db.objectStoreNames.contains(NOTE_STORE)) {
          // `keyPath: 'id'` — the note id IS the key, so a write is a `put`
          // with no separate key argument and cannot disagree with the record.
          db.createObjectStore(NOTE_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      // Fired when another tab holds an open connection at an older version.
      // Resolving null rather than hanging: the editor must not wait on a
      // database that may never open.
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
 * The distinction matters for writes: a request can succeed and its
 * transaction still abort (quota, a concurrent version change), and a caller
 * that cleared its "unsaved" marker on the request would then believe a write
 * that never landed. Reads resolve on the request because there is nothing to
 * commit.
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
          const transaction = db.transaction(NOTE_STORE, mode);
          const request = work(transaction.objectStore(NOTE_STORE));

          transaction.oncomplete = () => resolve(request.result ?? null);
          transaction.onerror = () => resolve(null);
          transaction.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

/** The browser's copy of one note, or `null` if it holds none. */
export function readLocalNote(id: string): Promise<LocalNote | null> {
  return runTransaction<LocalNote | undefined>('readonly', (store) =>
    store.get(id)
  ).then((note) => note ?? null);
}

/** Writes the browser's copy of one note, replacing whatever was there. */
export function writeLocalNote(note: LocalNote): Promise<void> {
  return runTransaction('readwrite', (store) => store.put(note)).then(
    () => undefined
  );
}

/**
 * Records that the server has accepted this copy: no longer dirty, and now
 * based on the row the server wrote.
 *
 * Read-modify-write inside ONE transaction rather than a `readLocalNote` and
 * a separate `writeLocalNote`. Between two transactions the debounce can fire
 * again and store a newer edit, which this would then mark clean — losing the
 * very "there is something still to send" flag the queue depends on. Inside
 * one transaction the store is locked for the duration.
 *
 * The guard against that race is `expectedContent`/`expectedTitle`: the mark
 * applies only if what is stored is still what the server just acknowledged.
 * If the author typed again while the request was in flight, the record stays
 * dirty and the next debounce sends it.
 */
export function markLocalNoteSynced(
  id: string,
  synced: { title: string; content: string; updatedAt: number }
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) {
          resolve();
          return;
        }

        try {
          const transaction = db.transaction(NOTE_STORE, 'readwrite');
          const store = transaction.objectStore(NOTE_STORE);
          const read = store.get(id);

          read.onsuccess = () => {
            const stored = read.result as LocalNote | undefined;
            if (!stored) return;

            const next: LocalNote = {
              ...stored,
              baseUpdatedAt: synced.updatedAt,
              // Still dirty if the buffer moved on while the save was in
              // flight — the flag describes what is STORED, not what was sent.
              dirty:
                stored.detail.title !== synced.title ||
                stored.detail.content !== synced.content,
            };
            store.put(next);
          };

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
          transaction.onabort = () => resolve();
        } catch {
          resolve();
        }
      })
  );
}

/**
 * Records a row that just came back from the server, so the NEXT open of this
 * note can paint from disk instead of waiting for the network.
 *
 * Declines when the stored copy is DIRTY, and that guard is the whole reason
 * this is not just `writeLocalNote`. A read can land while the browser is
 * still holding edits the server has not accepted — a save that failed, or a
 * tab that closed before its request left — and overwriting then would throw
 * away the only copy of the author's work, using data that is by definition
 * older than it.
 *
 * Read-modify-write inside ONE transaction, for the reason
 * `markLocalNoteSynced` gives: between two transactions the debounce can turn
 * a clean record dirty, and this would overwrite it anyway.
 */
export function cacheServerNote(
  id: string,
  detail: NoteDetail
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) {
          resolve();
          return;
        }

        try {
          const transaction = db.transaction(NOTE_STORE, 'readwrite');
          const store = transaction.objectStore(NOTE_STORE);
          const read = store.get(id);

          read.onsuccess = () => {
            const stored = read.result as LocalNote | undefined;
            if (stored?.dirty) return;

            store.put({
              id,
              detail,
              baseUpdatedAt: detail.updatedAt.getTime(),
              dirty: false,
              savedAt: Date.now(),
            } satisfies LocalNote);
          };

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
          transaction.onabort = () => resolve();
        } catch {
          resolve();
        }
      })
  );
}

/**
 * Every note the browser holds unsent edits for.
 *
 * The queue a reconnect drains. A cursor rather than `getAll()`: the whole
 * point is that most records are clean, and there is no reason to deserialise
 * every stored document to find the two that are not.
 */
export function listDirtyLocalNotes(): Promise<LocalNote[]> {
  return openDb().then(
    (db) =>
      new Promise<LocalNote[]>((resolve) => {
        if (!db) {
          resolve([]);
          return;
        }

        try {
          const transaction = db.transaction(NOTE_STORE, 'readonly');
          const dirty: LocalNote[] = [];
          const cursorRequest = transaction
            .objectStore(NOTE_STORE)
            .openCursor();

          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const note = cursor.value as LocalNote;
            if (note.dirty) dirty.push(note);
            cursor.continue();
          };

          transaction.oncomplete = () => resolve(dirty);
          transaction.onerror = () => resolve([]);
          transaction.onabort = () => resolve([]);
        } catch {
          resolve([]);
        }
      })
  );
}

/** Forgets the browser's copy of a note — what a delete leaves behind. */
export function deleteLocalNote(id: string): Promise<void> {
  return runTransaction('readwrite', (store) => store.delete(id)).then(
    () => undefined
  );
}

/**
 * Drops the cached connection. Tests only — a spec that swaps the global
 * `indexedDB` needs the next call to open against the new one rather than
 * reuse a handle to the old.
 */
export function __resetNoteLocalStore(): void {
  dbPromise = null;
}
