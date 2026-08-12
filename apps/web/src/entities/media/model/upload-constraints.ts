/**
 * The one definition of what may be uploaded, shared by the client forms and
 * the server action.
 *
 * It lived in `image-upload.tsx` as a local `maxSizeUploadInMbs = 3`, which
 * meant exactly one of the upload surfaces enforced it. Every rich text editor
 * in the dashboard passes `uploadSingleMedia` straight to the image extension
 * and never went near that component, so pasting an oversized image into a
 * blog, note, project, education or profile editor was unchecked.
 */

/** Per-file ceiling. The server rejects anything above this. */
export const MAX_IMAGE_SIZE_MB = 3;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * How many files one batch may carry.
 *
 * Bounded because the whole batch travels in a single server action request,
 * and `serverActions.bodySizeLimit` in `next.config.js` is sized from
 * `MAX_IMAGE_SIZE_MB * MAX_UPLOAD_BATCH` plus multipart overhead. Raising
 * either without raising that limit puts the rejection back in the framework,
 * where it surfaces as an opaque failure instead of the messages below.
 */
export const MAX_UPLOAD_BATCH = 5;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
] as const;

/**
 * Where a file belongs in the bucket.
 *
 * Storage keys used to be `users/<id>/media/<year>/<month>/<day>/…`, which
 * sorts every image the site has ever used into one undifferentiated pile —
 * fine for an upload log, useless for finding the images a blog post uses.
 */
export const MEDIA_SCOPES = [
  'blog',
  'note',
  'project',
  'education',
  'profile',
  'general',
] as const;

export type MediaScope = (typeof MEDIA_SCOPES)[number];

export type MediaValidationError =
  | { kind: 'type'; fileName: string }
  | { kind: 'size'; fileName: string; maxSizeMb: number }
  | { kind: 'batch'; max: number };

/**
 * The first thing wrong with `files`, or `null` if they are all acceptable.
 *
 * Returns a description rather than a formatted string so a client caller can
 * translate it — the same function guards the server action, where the user's
 * locale is not available under this repo's conventions.
 */
export function findUploadViolation(files: File[]): MediaValidationError | null {
  if (files.length > MAX_UPLOAD_BATCH) {
    return { kind: 'batch', max: MAX_UPLOAD_BATCH };
  }

  for (const file of files) {
    if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as never)) {
      return { kind: 'type', fileName: file.name };
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        kind: 'size',
        fileName: file.name,
        maxSizeMb: MAX_IMAGE_SIZE_MB,
      };
    }
  }

  return null;
}

/**
 * The violation as a plain English sentence, for a server action's `errorMsg`.
 *
 * Server actions in this repo return untranslated strings (`'Education not
 * found'` and friends) because the request locale is not plumbed into them.
 * Clients that can do better translate the structured violation instead; this
 * is the backstop for the paths that cannot.
 */
export function describeViolation(violation: MediaValidationError): string {
  switch (violation.kind) {
    case 'batch':
      return `Too many files at once. Upload at most ${violation.max}.`;
    case 'type':
      return `"${violation.fileName}" is not an accepted image format.`;
    case 'size':
      return `"${violation.fileName}" is larger than ${violation.maxSizeMb} MB.`;
  }
}

/**
 * The file extension for a stored object, from the MIME type rather than the
 * filename.
 *
 * The editor's auto-upload path builds its File as `new File([blob], 'image')`
 * — no extension at all — so deriving it from the name produced keys ending in
 * `.image`, which no browser or CDN will serve with a sensible content type.
 */
export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/svg+xml':
      return 'svg';
    default:
      // `image/png` → `png`, `image/webp` → `webp`, and so on.
      return mimeType.split('/')[1] ?? 'bin';
  }
}
