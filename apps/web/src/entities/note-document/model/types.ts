/**
 * One attachment, as every panel and row renders it.
 *
 * Deliberately narrower than the `NoteDocument` row. `fileKey` is absent
 * because it is the object's address in a PRIVATE bucket and no client has any
 * use for it — the only address an attachment has on the browser side is
 * `noteDocumentHref(id)`, which goes through the session-checked route.
 * `ownerId` and `noteId` are absent for the same reason: the panel already
 * knows which note it is drawing, and the owner is always the caller.
 */
export interface NoteDocumentSummary {
  id: string;
  title: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}
