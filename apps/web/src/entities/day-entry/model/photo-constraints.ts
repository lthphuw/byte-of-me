/**
 * What may be attached to a day, and how many.
 *
 * The numbers are copied from `entities/media/model/upload-constraints`
 * rather than raised, because they have to fit under
 * `serverActions.bodySizeLimit` in `next.config.js` — a flat `'20mb'`, which
 * five 3 MB files plus multipart overhead sit comfortably inside. Raising
 * either number without raising that limit would not mean larger uploads; it
 * would move the rejection back into the framework, where it surfaces as an
 * opaque body-size error instead of a sentence naming the file.
 */
export const MAX_PHOTO_SIZE_MB = 3;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/** Per batch AND per day. One day is a handful of pictures; a day that needs
 *  twenty is an album, and an album is not this feature. */
export const MAX_PHOTOS_PER_DAY = 5;

/**
 * `image/svg+xml` is absent, though the media library accepts it.
 *
 * An SVG is a document that can carry script, and these bytes are served from
 * `/api/health/photos/[id]` — a same-origin address. Accepting one would hand
 * any object in the bucket the ability to run on this domain.
 */
export const ACCEPTED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export type PhotoValidationError =
  | { kind: 'heic'; fileName: string }
  | { kind: 'type'; fileName: string }
  | { kind: 'size'; fileName: string; maxSizeMb: number }
  | { kind: 'batch'; max: number };

/**
 * A HEIC/HEIF file, by MIME type or — when the picker reported no type at
 * all, which some Android pickers do — by filename extension.
 */
function isHeic(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return file.type === '' && /\.hei[cf]$/i.test(file.name);
}

/** The first thing wrong with `files`, or `null`. Returns a description rather
 *  than a formatted string so a client caller can translate it — server
 *  actions in this repo have no request locale. */
export function findPhotoViolation(
  files: File[],
  existingCount = 0
): PhotoValidationError | null {
  if (files.length + existingCount > MAX_PHOTOS_PER_DAY) {
    return { kind: 'batch', max: MAX_PHOTOS_PER_DAY };
  }

  for (const file of files) {
    // Checked BEFORE the general type check below, or that branch claims the
    // file first and this honest message never renders. HEIC is deliberately
    // NOT in `ACCEPTED_PHOTO_MIME_TYPES`: server-side `sharp` cannot decode it
    // without libheif (dimensions would store as 0x0), and Chrome and Firefox
    // cannot display it at all.
    if (isHeic(file)) {
      return { kind: 'heic', fileName: file.name };
    }
    if (!ACCEPTED_PHOTO_MIME_TYPES.includes(file.type as never)) {
      return { kind: 'type', fileName: file.name };
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return {
        kind: 'size',
        fileName: file.name,
        maxSizeMb: MAX_PHOTO_SIZE_MB,
      };
    }
  }

  return null;
}

/** The violation as a plain English sentence, for an `errorMsg`. */
export function describePhotoViolation(v: PhotoValidationError): string {
  switch (v.kind) {
    case 'batch':
      return `A day holds at most ${v.max} photos.`;
    case 'heic':
      return "That photo is in Apple's HEIC format. Turn image compression on in settings and it will be converted automatically.";
    case 'type':
      return `"${v.fileName}" is not an accepted image format.`;
    case 'size':
      return `"${v.fileName}" is larger than ${v.maxSizeMb} MB.`;
  }
}

/**
 * The file extension, from the MIME type rather than the filename.
 *
 * A photo picked on iOS can arrive as `new File([blob], 'image')` with no
 * extension at all, and a key ending `.image` is one no CDN will serve with a
 * sensible content type.
 */
export function photoExtension(mimeType: string): string {
  return mimeType === 'image/jpeg' ? 'jpg' : (mimeType.split('/')[1] ?? 'bin');
}
