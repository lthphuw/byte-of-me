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

/** A short demo clip, not a film. It goes browser → storage; a server action body tops out at 4.5 MB on Vercel. */
export const MAX_VIDEO_SIZE_MB = 10;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

/**
 * How many files one batch may carry.
 *
 * Bounded because the whole batch travels in a single server action request,
 * and `serverActions.bodySizeLimit` in `next.config.js` is a flat `'20mb'`
 * that `MAX_UPLOAD_TOTAL_BYTES` plus multipart overhead has to fit comfortably
 * under — not the other way around. Raising either without raising that limit
 * puts the rejection back in the framework, where it surfaces as an opaque
 * failure instead of the messages below.
 */
export const MAX_UPLOAD_BATCH = 5;

/**
 * What one request may carry in total. Five images at the 3 MB cap are 15 MB, so
 * this leaves every image-only batch as it was; it exists because five videos at
 * their own 10 MB cap would be 50 MB and hit the framework's body limit instead.
 */
export const MAX_UPLOAD_TOTAL_MB = 16;
export const MAX_UPLOAD_TOTAL_BYTES = MAX_UPLOAD_TOTAL_MB * 1024 * 1024;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

/** Two containers every current browser plays; nothing else is stored as video. */
export const ACCEPTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;

export type AcceptedVideoMimeType = (typeof ACCEPTED_VIDEO_MIME_TYPES)[number];

export const ACCEPTED_MEDIA_MIME_TYPES = [
  ...ACCEPTED_IMAGE_MIME_TYPES,
  ...ACCEPTED_VIDEO_MIME_TYPES,
] as const;

export type AcceptedMediaMimeType = (typeof ACCEPTED_MEDIA_MIME_TYPES)[number];

export function isVideoMimeType(
  mimeType: string
): mimeType is AcceptedVideoMimeType {
  return (ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Anything stored as `image/*`, for the pickers that can only draw an `<img>`. */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** The per-file ceiling for a (declared or sniffed) type: video gets its own, higher one. */
export function maxUploadSizeFor(mimeType: string): {
  bytes: number;
  mb: number;
} {
  return isVideoMimeType(mimeType)
    ? { bytes: MAX_VIDEO_SIZE_BYTES, mb: MAX_VIDEO_SIZE_MB }
    : { bytes: MAX_IMAGE_SIZE_BYTES, mb: MAX_IMAGE_SIZE_MB };
}

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
  'featured-work',
  'general',
] as const;

export type MediaScope = (typeof MEDIA_SCOPES)[number];

/** Why the editors refuse a clip: they draw an `<img>`; a clip is a featured work's demo. */
export function describeVideoNotAllowed(fileName: string): string {
  return `"${fileName}" is a video. Only images can be added here; clips belong to a featured work's demo.`;
}

export type MediaValidationError =
  | { kind: 'type'; fileName: string }
  | { kind: 'size'; fileName: string; maxSizeMb: number }
  | { kind: 'batch'; max: number }
  | { kind: 'total'; maxSizeMb: number };

/**
 * The first thing wrong with `files`, or `null` if they are all acceptable.
 *
 * Returns a description rather than a formatted string so a client caller can
 * translate it — the same function guards the server action, where the user's
 * locale is not available under this repo's conventions.
 */
export function findUploadViolation(
  files: File[]
): MediaValidationError | null {
  if (files.length > MAX_UPLOAD_BATCH) {
    return { kind: 'batch', max: MAX_UPLOAD_BATCH };
  }

  for (const file of files) {
    if (!ACCEPTED_MEDIA_MIME_TYPES.includes(file.type as never)) {
      return { kind: 'type', fileName: file.name };
    }
    const max = maxUploadSizeFor(file.type);
    if (file.size > max.bytes) {
      return { kind: 'size', fileName: file.name, maxSizeMb: max.mb };
    }
  }

  if (
    files.reduce((sum, file) => sum + file.size, 0) > MAX_UPLOAD_TOTAL_BYTES
  ) {
    return { kind: 'total', maxSizeMb: MAX_UPLOAD_TOTAL_MB };
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
      return `"${violation.fileName}" is not an accepted image or video format.`;
    case 'size':
      return `"${violation.fileName}" is larger than ${violation.maxSizeMb} MB.`;
    case 'total':
      return `The files add up to more than ${violation.maxSizeMb} MB. Upload fewer at once.`;
  }
}

/** Thrown by the client uploaders; `violation` lets a caller translate it. */
export class MediaViolationError extends Error {
  constructor(readonly violation: MediaValidationError) {
    super(describeViolation(violation));
    this.name = 'MediaViolationError';
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

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end));

/**
 * True when the text opens with `<svg`, after any prolog, comments or doctype.
 * Walked with `indexOf`: one regex over many comments backtracks exponentially.
 */
function startsWithSvgElement(text: string): boolean {
  let rest = text.trimStart();

  for (;;) {
    const [open, close] = rest.startsWith('<?')
      ? ['<?', '?>']
      : rest.startsWith('<!--')
      ? ['<!--', '-->']
      : /^<!doctype/i.test(rest)
      ? ['<!', '>']
      : [];
    if (!open || !close) break;

    const end = rest.indexOf(close, open.length);
    if (end === -1) return false;
    rest = rest.slice(end + close.length).trimStart();
  }

  return /^<svg[\s>]/i.test(rest);
}

/**
 * The format from the bytes' signature, never from `File.type`, which is the
 * caller's claim (an HTML file sent as `image/png` is still HTML). `null`
 * means not an accepted format.
 */
export function detectImageMimeType(
  bytes: Uint8Array
): AcceptedImageMimeType | null {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return 'image/png';
  }

  const head = ascii(bytes, 0, 6);
  if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif';

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // `ftyp` box: major brand, minor version, compatible brands. Some encoders
  // write `mif1` as the major brand and list `avif` only as compatible.
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const boxEnd = Math.min(
      bytes.length,
      ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0,
      64
    );
    for (let at = 8; at + 4 <= boxEnd; at += at === 8 ? 8 : 4) {
      const brand = ascii(bytes, at, at + 4);
      if (brand === 'avif' || brand === 'avis') return 'image/avif';
    }
  }

  if (startsWithSvgElement(new TextDecoder().decode(bytes.subarray(0, 2048)))) {
    return 'image/svg+xml';
  }

  return null;
}

/** Brands an MP4 may declare as its major brand (ISO base media, MP4 v1/v2, AVC, iTunes M4V). */
const MP4_MAJOR_BRANDS = new Set([
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'M4V ',
]);
/** A real `ftyp` box is a few dozen bytes; the cap only stops a hostile size from steering the parse. */
const MAX_FTYP_BOX_BYTES = 1024;

function isMp4(bytes: Uint8Array): boolean {
  // size (4) + 'ftyp' (4) + major brand (4) + minor version (4) is the smallest box.
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== 'ftyp') return false;
  const boxSize =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  // 0 and 1 mean "to end of file" / "64-bit size", which no `ftyp` uses; a box
  // longer than the file is a truncated header; compatible brands are 4 bytes each.
  if (boxSize < 16 || boxSize > MAX_FTYP_BOX_BYTES) return false;
  if (boxSize > bytes.length || (boxSize - 16) % 4 !== 0) return false;
  return MP4_MAJOR_BRANDS.has(ascii(bytes, 8, 12));
}

const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];
const EBML_DOC_TYPE_ID = 0x4282;
const MAX_EBML_HEADER_BYTES = 1024;

/** Bytes a vint occupies, from its first byte's leading zeros; 0 when it is not one. */
function vintLength(first: number | undefined): number {
  return first ? Math.clz32(first) - 23 : 0;
}

/** True when the EBML header's DocType element reads `webm` (Matroska's `matroska` is not WebM). */
function isWebm(bytes: Uint8Array): boolean {
  if (!EBML_MAGIC.every((byte, index) => bytes[index] === byte)) return false;

  // The header's size is a vint with its length marker stripped.
  const sizeLength = vintLength(bytes[4]);
  if (sizeLength === 0 || 4 + sizeLength > bytes.length) return false;
  let headerSize = bytes[4] & (0xff >> sizeLength);
  for (let i = 1; i < sizeLength; i += 1)
    headerSize = headerSize * 256 + bytes[4 + i];

  const start = 4 + sizeLength;
  const end = start + headerSize;
  if (
    headerSize === 0 ||
    headerSize > MAX_EBML_HEADER_BYTES ||
    end > bytes.length
  ) {
    return false;
  }

  // Walk the header's children: id (marker kept), size (marker stripped), payload.
  let at = start;
  while (at < end) {
    const idLength = vintLength(bytes[at]);
    if (idLength === 0 || idLength > 4 || at + idLength > end) return false;
    let id = 0;
    for (let i = 0; i < idLength; i += 1) id = id * 256 + bytes[at + i];

    const lengthOfSize = vintLength(bytes[at + idLength]);
    if (lengthOfSize === 0 || at + idLength + lengthOfSize > end) return false;
    let size = bytes[at + idLength] & (0xff >> lengthOfSize);
    for (let i = 1; i < lengthOfSize; i += 1) {
      size = size * 256 + bytes[at + idLength + i];
    }

    const payload = at + idLength + lengthOfSize;
    if (payload + size > end) return false;
    if (id === EBML_DOC_TYPE_ID)
      return ascii(bytes, payload, payload + size) === 'webm';
    at = payload + size;
  }

  return false;
}

/**
 * The video format from the bytes, never from `File.type` or the extension:
 * an MP4 is an `ftyp` box with an accepted major brand at offset 4, a WebM an
 * EBML header whose DocType is `webm`. A truncated header is `null`.
 */
export function detectVideoMimeType(
  bytes: Uint8Array
): AcceptedVideoMimeType | null {
  if (isMp4(bytes)) return 'video/mp4';
  if (isWebm(bytes)) return 'video/webm';
  return null;
}

/** Image or video, by signature. `null` means not an accepted format. */
export function detectMediaMimeType(
  bytes: Uint8Array
): AcceptedMediaMimeType | null {
  return detectVideoMimeType(bytes) ?? detectImageMimeType(bytes);
}

/**
 * The type to store for an upload, or `null` to refuse it. The bytes decide; the
 * caller's `declared` type may only agree. An image is stored as what its bytes
 * are (a PNG sent as JPEG is a PNG), but a video, or bytes that are a video,
 * must match the declaration exactly: a PNG renamed `.mp4` arrives declared as
 * `video/mp4` and is refused, and so is an MP4 declared as an image.
 */
export function resolveUploadedMimeType(
  declared: string,
  bytes: Uint8Array
): AcceptedMediaMimeType | null {
  const sniffed = detectMediaMimeType(bytes);
  if (!sniffed) return null;
  if (isVideoMimeType(sniffed) || isVideoMimeType(declared)) {
    return sniffed === declared ? sniffed : null;
  }
  return sniffed;
}

const MAX_STORED_FILE_NAME_LENGTH = 120;

/**
 * The library's display name for a client filename: no path separators or
 * control characters, capped in length, extension kept when it is cut.
 */
export function sanitizeStoredFileName(name: string): string {
  const cleaned = [...name]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      const isControl = code < 0x20 || (code >= 0x7f && code <= 0x9f);

      return isControl || character === '/' || character === '\\'
        ? '_'
        : character;
    })
    .join('')
    .trim();

  if (cleaned.length <= MAX_STORED_FILE_NAME_LENGTH) {
    return cleaned || 'image';
  }

  const dot = cleaned.lastIndexOf('.');
  const extension =
    dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';

  return (
    cleaned.slice(0, MAX_STORED_FILE_NAME_LENGTH - extension.length) + extension
  );
}
