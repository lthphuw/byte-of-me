import { generateFriendlyId } from '@/shared/lib/friendly-id';

/**
 * Where an attachment's bytes live in the PRIVATE bucket.
 *
 * `users/<ownerId>/notes/<noteId>/<friendlyId>.pdf` — owner first so a whole
 * account's objects can be listed or removed by prefix, note second so an
 * orphan sweep can be scoped to one document. The uploaded file name is NOT
 * part of the key: it is author-supplied text that would have to be escaped
 * here and unescaped in every consumer, and the display name already lives in
 * `NoteDocument.title` where renaming it costs nothing.
 *
 * The extension is passed in rather than derived here, because the caller has
 * already validated the MIME type against its own allowlist and is the only
 * one that knows which — attachments accept `application/pdf` and nothing
 * else, inline images accept a handful of raster types.
 */
export function noteDocumentFileKey(
  ownerId: string,
  noteId: string,
  extension = 'pdf'
): string {
  return `users/${ownerId}/notes/${noteId}/${generateFriendlyId()}.${extension}`;
}
