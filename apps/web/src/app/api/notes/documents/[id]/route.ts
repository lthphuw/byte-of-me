import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Serves the bytes of one note attachment.
 *
 * A route handler rather than a server action because a `<embed>`/`<iframe>`
 * PDF viewer needs a URL it can `GET`; a server action has no address a
 * browser can point an element at. And it cannot be a public or presigned URL
 * either: `SUPABASE_S3_PRIVATE_BUCKET` exists precisely so an attachment has
 * no address that works without a session (the sibling `byte-of-me` bucket is
 * public — measured, see `shared/api/s3-storage-api.ts`). This route is the
 * ONLY address an attachment has, which is why the guard below is a security
 * boundary and not a convenience.
 *
 * `nodejs`, not `edge`: the bytes are streamed out of S3 through the AWS SDK.
 */
export const runtime = 'nodejs';

/**
 * What this route will serve, and the extension each type is named with.
 *
 * An allowlist rather than a pass-through, because the value on the left is
 * what the response is LABELLED with — a type this table does not know is
 * refused rather than guessed at.
 *
 * `image/svg+xml` is deliberately absent. An SVG is a document that can carry
 * script, and this route is same-origin: serving one would hand any object in
 * the bucket the ability to run on this domain. Nothing uploads them today,
 * and whoever changes that has to come here and read this first.
 */
const SERVABLE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Used when a title sanitises down to nothing at all (e.g. `"""`). */
const FALLBACK_FILE_NAME = 'document';

/**
 * The display file name for a row, from its user-supplied `title`.
 *
 * Control characters are the header-injection vector — a title carrying `\r\n`
 * would otherwise end one header and start another — so they are folded to
 * spaces here, before either encoding below sees them, rather than being
 * relied upon to survive percent-encoding intact.
 *
 * The extension is appended when the title does not already carry it, and it
 * comes from the row's MIME type rather than from the title: `title` defaults
 * to the uploaded file's name but is a free-text label, and a reader who saves
 * the file should not get an extensionless blob — nor a `.pdf` that is really
 * a PNG.
 */
function displayFileName(title: string, extension: string): string {
  const cleaned = title
    // The rule exists to catch a control character typed into a regex by
    // accident; matching them here is the entire point.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return `${FALLBACK_FILE_NAME}.${extension}`;
  return new RegExp(`\\.${extension}$`, 'i').test(cleaned)
    ? cleaned
    : `${cleaned}.${extension}`;
}

/**
 * The `filename=` fallback, for clients that do not understand `filename*`.
 *
 * It lives inside a quoted-string, so `"` and `\` must not survive — those two
 * are what would let a title break out of the parameter. Everything non-ASCII
 * is transliterated where it decomposes (`Tài liệu` → `Tai lieu`) and dropped
 * where it does not, because a quoted-string is bytes and a UTF-8 title here
 * is read differently by every client. The real name travels in `filename*`.
 */
function asciiFileName(name: string, extension: string): string {
  const ascii = name
    .normalize('NFKD')
    // Combining marks left behind by NFKD — the Vietnamese tone and vowel
    // marks. `đ`/`Đ` have no decomposition at all, so they are named.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/["\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // A leading dot means the sanitising ate the whole name and left only the
  // extension (`"""` → `.pdf`), which reads as a hidden file rather than a
  // document. The real name is still in `filename*`; this is only the
  // fallback, so a generic one is the right answer.
  if (!ascii || ascii.startsWith('.')) {
    return `${FALLBACK_FILE_NAME}.${extension}`;
  }
  return ascii;
}

/**
 * RFC 5987 `ext-value`: `UTF-8''` followed by percent-encoded `attr-char`s.
 *
 * `encodeURIComponent` leaves `'`, `(`, `)` and `*` unescaped and none of them
 * is an `attr-char`, so they are escaped by hand afterwards. Everything else
 * it escapes is already a superset of what the grammar forbids.
 */
function encodeRfc5987(name: string): string {
  return encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * The `Content-Disposition` value for a row's title.
 *
 * Both forms are emitted: `filename*` carries the real, non-ASCII name (these
 * titles are routinely Vietnamese), and the quoted `filename` is the fallback
 * for anything that ignores it. Exported for its test — the escaping is the
 * security-relevant part of this file after the ownership check, and it is
 * worth pinning directly as well as through a request.
 */
export function contentDispositionFor(
  title: string,
  extension = 'pdf'
): string {
  const name = displayFileName(title, extension);
  return `inline; filename="${asciiFileName(name, extension)}"; filename*=UTF-8''${encodeRfc5987(name)}`;
}

/**
 * Answered for a row that does not exist, a row owned by somebody else, AND a
 * row whose object has gone missing — deliberately indistinguishable.
 *
 * A 403 for the second case would confirm to a stranger that this id names a
 * real attachment belonging to someone, which is exactly the fact the private
 * bucket exists to withhold. Ids are cuids, so 404 leaves nothing to probe.
 */
function notFound(): Response {
  return Response.json(
    { success: false, errorMsg: 'Not found' },
    { status: 404 }
  );
}

/**
 * Whether S3 said the object is not there, as opposed to failing to answer.
 *
 * The distinction matters: a genuinely absent object is a 404 (the row and the
 * bucket have drifted), but a transient S3 failure answering 404 would tell
 * the reader their file no longer exists and invite them to delete a row that
 * is perfectly fine.
 */
function isMissingObjectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const { name, $metadata } = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };

  return (
    name === 'NoSuchKey' ||
    name === 'NotFound' ||
    $metadata?.httpStatusCode === 404
  );
}

export async function GET(
  _request: Request,
  // Next.js 16: dynamic params arrive as a Promise.
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let viewerId: string;
  try {
    // `requireUser`, not `requireAdmin`. Attachments are the owner's, but
    // INLINE images are part of a note's body — and a note can be shared, so
    // an admin-only guard would render a shared document with every image
    // broken. Authorisation is the two-step check below, not the role.
    ({ id: viewerId } = await requireUser());
  } catch {
    return Response.json(
      { success: false, errorMsg: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;

  const document = await prisma.noteDocument.findUnique({
    where: { id },
    select: {
      title: true,
      fileKey: true,
      ownerId: true,
      mimeType: true,
      noteId: true,
    },
  });

  if (!document) return notFound();

  // Read then compare, rather than `where: { id, ownerId }`, so both cases are
  // visible here and can be shown to answer identically. See `notFound()` for
  // why a row someone else owns is a 404 and not a 403.
  if (document.ownerId !== viewerId) {
    // Not the owner — but possibly someone the note is shared with.
    // `resolveNoteAccess` is the sharing feature's own boundary: it walks from
    // the note UP to find a grant, so a grant on any ancestor folder counts
    // and there is no subtree check here to get wrong.
    const access = await resolveNoteAccess(document.noteId);
    if (!access) return notFound();
  }

  // Refused, not guessed at: the response is LABELLED with this value, and a
  // type the allowlist does not know could be anything.
  const extension = SERVABLE_TYPES[document.mimeType];
  if (!extension) {
    logger.error(
      `Note document ${id} has unservable mime type ${document.mimeType}`
    );
    return notFound();
  }

  let file: Awaited<ReturnType<typeof privateStorage.getFile>>;
  try {
    file = await privateStorage.getFile(document.fileKey);
  } catch (error) {
    logger.error(
      `Failed to read note attachment ${id}: ${getErrorMessage(error)}`
    );
    if (isMissingObjectError(error)) return notFound();
    return Response.json(
      { success: false, errorMsg: 'Failed to read the attachment' },
      { status: 502 }
    );
  }

  // A response with no body is not a zero-byte PDF, it is a broken viewer.
  // Same answer as a missing row: the object is gone either way.
  if (!file.body) {
    logger.error(`Note attachment ${id} has no body in the private bucket`);
    return notFound();
  }

  const headers = new Headers({
    // From OUR row, through the allowlist above — never echoed from S3.
    // `ContentType` there is whatever was written at upload time; trusting it
    // would let an object stored as `text/html` execute as a same-origin
    // script on this domain.
    'Content-Type': document.mimeType,
    // Closes the sniffing path the hardcoded type leaves open.
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': contentDispositionFor(document.title, extension),
    // `private`, so no shared cache ever holds an owner-only file. The object
    // is immutable — a re-upload writes a new row with a new key — so the
    // only thing that can go stale at this URL is a deleted attachment, and
    // an hour of that is the trade being made.
    'Cache-Control': 'private, max-age=3600',
  });

  if (typeof file.contentLength === 'number') {
    headers.set('Content-Length', String(file.contentLength));
  }

  // No `Range` support, deliberately. Chrome's PDF viewer asks for ranges and
  // falls back to one full fetch when the server does not advertise them,
  // which at the 5 MB upload ceiling nobody feels. Written down so it is not
  // hunted as a bug later.
  return new Response(file.body, { status: 200, headers });
}
