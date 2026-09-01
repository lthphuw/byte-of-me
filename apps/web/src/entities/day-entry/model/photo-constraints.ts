/**
 * What may be attached to a day, and how many. Both numbers have to fit under
 * `serverActions.bodySizeLimit` (a flat `'20mb'`): raise either without
 * raising that and the rejection becomes an opaque framework body-size error.
 */
export const MAX_PHOTO_SIZE_MB = 3;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/** Per batch AND per day. A day needing twenty is an album, not a journal. */
export const MAX_PHOTOS_PER_DAY = 5;

/** `image/svg+xml` is absent though the media library accepts it: an SVG is a
 *  document that can carry script, and these bytes are served same-origin
 *  from `/api/health/photos/[id]`. */
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

/** HEIC/HEIF by MIME type, or by extension when the picker reported no type
 *  at all, which some Android pickers do. */
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
    // BEFORE the general type check, or that branch claims the file first
    // and this honest message never renders. HEIC stays out of the accepted
    // list: `sharp` needs libheif, and two browsers cannot display it.
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

/**
 * The violation as a plain English sentence. English-only by omission: it is
 * called from both a client hook and a server action, which need translators
 * from two different next-intl entry points. Queued with the i18n rewrite.
 */
export function describePhotoViolation(v: PhotoValidationError): string {
  switch (v.kind) {
    case 'batch':
      return `A day holds at most ${v.max} photos.`;
    case 'heic':
      return "That photo is in Apple's HEIC format, which this app can't store. Convert it to JPEG or PNG first — a phone usually does this automatically during upload.";
    case 'type':
      return `"${v.fileName}" is not an accepted image format.`;
    case 'size':
      return `"${v.fileName}" is larger than ${v.maxSizeMb} MB.`;
  }
}

/** From the MIME type, not the filename: a photo picked on iOS can arrive as
 *  `new File([blob], 'image')`, and a key ending `.image` is one no CDN
 *  serves with a sensible content type. */
export function photoExtension(mimeType: string): string {
  return mimeType === 'image/jpeg' ? 'jpg' : (mimeType.split('/')[1] ?? 'bin');
}
