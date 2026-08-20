/**
 * What may be attached to a note, shared by the drop zone and the server
 * action.
 *
 * Self-contained on purpose: `entities/media/model/upload-constraints.ts` is a
 * different ceiling, a different MIME list and different semantics (it also
 * carries a batch cap, because images travel as one batched server-action
 * request). Attachments go one file per request, so merging the two modules
 * would mean one of the two call sites reading a rule that does not apply to
 * it — see the header of that file for what happens when a rule lives
 * somewhere only half the upload paths pass through.
 */

/**
 * Per-file ceiling. The server rejects anything above this.
 *
 * `serverActions.bodySizeLimit` in `next.config.js` is what a breach hits
 * FIRST if this grows past it, and the framework's refusal cannot name the
 * offending file — which is the whole reason `uploadNoteDocument` takes one
 * file per request rather than a batch.
 */
export const MAX_DOCUMENT_SIZE_MB = 5;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

/**
 * PDF only, this pass. docx/pptx are deliberately out of scope: the viewer is
 * the browser's own PDF renderer, and there is nothing to render the others
 * with that does not mean shipping a converter.
 */
export const ACCEPTED_DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

export type DocumentValidationError =
  | { kind: 'type'; fileName: string }
  | { kind: 'size'; fileName: string; maxSizeMb: number };

export function isAcceptedDocument(mimeType: string): boolean {
  return ACCEPTED_DOCUMENT_MIME_TYPES.includes(mimeType as never);
}

/**
 * The first thing wrong with `file`, or `null` if it is acceptable.
 *
 * Returns a description rather than a formatted string so a client caller can
 * translate it — the same function guards the server action, where the user's
 * locale is not available under this repo's conventions.
 *
 * Type is checked before size so a `.docx` that also happens to be oversized
 * is reported as the wrong KIND of file, which is the fact the author can act
 * on; being told to shrink a file that would be refused at any size is worse
 * than useless.
 */
export function findDocumentViolation(
  file: File
): DocumentValidationError | null {
  if (!isAcceptedDocument(file.type)) {
    return { kind: 'type', fileName: file.name };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      kind: 'size',
      fileName: file.name,
      maxSizeMb: MAX_DOCUMENT_SIZE_MB,
    };
  }

  return null;
}

/**
 * The violation as a plain English sentence, for a server action's `errorMsg`.
 *
 * Server actions in this repo return untranslated strings (`'Note not found'`
 * and friends) because the request locale is not plumbed into them. Clients
 * that can do better translate the structured violation instead; this is the
 * backstop for the paths that cannot — and for a caller that reached the
 * action without going through the drop zone at all.
 */
export function describeDocumentViolation(
  violation: DocumentValidationError
): string {
  switch (violation.kind) {
    case 'type':
      return `"${violation.fileName}" is not a PDF.`;
    case 'size':
      return `"${violation.fileName}" is larger than ${violation.maxSizeMb} MB.`;
  }
}

/**
 * Where the bytes are served from. The ONLY address an attachment has.
 *
 * There is no public URL and no presigned one: the object lives in a private
 * bucket and reaches a reader through this route, which checks the session
 * first. Built here rather than inlined at each call site so nothing can
 * hardcode a bucket URL (AGENTS §11.7).
 */
export function noteDocumentHref(id: string): string {
  return `/api/notes/documents/${id}`;
}

/**
 * The PDFs in a `DataTransfer`/`FileList`, `[]` if there are none.
 *
 * A mixed drop keeps its PDFs and drops the rest; the caller is responsible
 * for saying out loud what it ignored (`toasts.attachmentIgnored`), because
 * losing a file silently is worse than losing it loudly.
 *
 * Filters on the MIME type, not the extension: a `DataTransfer` from a native
 * file manager always carries a type, and the extension is attacker-chosen
 * text that the browser never consulted.
 */
export function documentFilesFrom(
  files: FileList | File[] | null | undefined
): File[] {
  if (!files) return [];

  return Array.from(files).filter((file) => isAcceptedDocument(file.type));
}

/**
 * What may be pasted or dropped INTO a note's body.
 *
 * A separate list from the attachment one, and separate from
 * `entities/media`'s `ACCEPTED_IMAGE_MIME_TYPES`, because the three answer
 * different questions. The media list is what may go in the public library —
 * it includes `image/svg+xml`, which is fine for a blog cover served from a
 * CDN and NOT fine here: an inline note image is served same-origin by
 * `/api/notes/documents/[id]`, and an SVG is a document that can carry script.
 * That route's own allowlist refuses SVG too; this is the same rule stated at
 * the door instead of at the exit.
 */
export const ACCEPTED_INLINE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/**
 * The same 5 MB as an attachment.
 *
 * The media library's ceiling is 3 MB, and matching it was tempting. But the
 * limit that matters is `bodySizeLimit`, which both paths share, and an author
 * pasting a screenshot has no way to tell which of two limits applies to what
 * they just pasted. One number for everything a note can hold.
 */
export const MAX_INLINE_IMAGE_SIZE_MB = MAX_DOCUMENT_SIZE_MB;
export const MAX_INLINE_IMAGE_SIZE_BYTES = MAX_DOCUMENT_SIZE_BYTES;

export function isAcceptedInlineImage(mimeType: string): boolean {
  return (ACCEPTED_INLINE_IMAGE_MIME_TYPES as readonly string[]).includes(
    mimeType
  );
}

/** The first thing wrong with `file`, or `null` if it may be pasted in. */
export function findInlineImageViolation(
  file: File
): DocumentValidationError | null {
  if (!isAcceptedInlineImage(file.type)) {
    return { kind: 'type', fileName: file.name };
  }
  if (file.size > MAX_INLINE_IMAGE_SIZE_BYTES) {
    return {
      kind: 'size',
      fileName: file.name,
      maxSizeMb: MAX_INLINE_IMAGE_SIZE_MB,
    };
  }
  return null;
}

/**
 * The storage-key extension for an accepted inline image.
 *
 * From the MIME type, never from the file name: the editor's own auto-upload
 * builds its File as `new File([blob], 'image')` with no extension at all —
 * `entities/media` records that trap, and this path inherits it.
 */
export function inlineImageExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  return mimeType.split('/')[1] ?? 'bin';
}
