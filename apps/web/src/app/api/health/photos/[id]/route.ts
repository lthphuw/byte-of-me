import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Serves the bytes of one day photo.
 *
 * A route handler rather than a server action because an `<img>` needs a URL
 * it can `GET`, and a server action has no address an element can point at.
 * And it cannot be a public or presigned URL either: these objects live in
 * `SUPABASE_S3_PRIVATE_BUCKET` precisely so a personal photograph has no
 * address that works without a session. This route is the ONLY address one
 * has, which is why the guard below is a security boundary and not a
 * convenience.
 *
 * `requireAdmin`, not `requireUser`. The note-document route uses the looser
 * guard because a note can be SHARED and its inline images have to render for
 * a recipient. Nothing about a day journal is shareable, so the narrower guard
 * is the correct one — and narrowing it later, after something links to these
 * URLs, would be the hard direction.
 *
 * `nodejs`, not `edge`: the bytes stream out of S3 through the AWS SDK.
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
 * the bucket the ability to run on this domain. `upload-day-photos` refuses
 * them too; this is the second of the two locks.
 */
const SERVABLE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export async function GET(
  _request: Request,
  // Next.js 16: dynamic params arrive as a Promise.
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let viewerId: string;
  try {
    ({ id: viewerId } = await requireAdmin());
  } catch {
    return Response.json(
      { success: false, errorMsg: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;

  const photo = await prisma.dayPhoto.findUnique({
    where: { id },
    select: { fileKey: true, mimeType: true, ownerId: true },
  });

  // 404 rather than 403 for a photo that is not the viewer's. A 403 confirms
  // the id exists, which is one bit more than a stranger should learn.
  if (!photo || photo.ownerId !== viewerId) {
    return Response.json(
      { success: false, errorMsg: 'Not found' },
      { status: 404 }
    );
  }

  const extension = SERVABLE_TYPES[photo.mimeType];
  if (!extension) {
    return Response.json(
      { success: false, errorMsg: 'Unsupported media type' },
      { status: 415 }
    );
  }

  try {
    const file = await privateStorage.getFile(photo.fileKey);

    if (!file.body) {
      return Response.json(
        { success: false, errorMsg: 'Not found' },
        { status: 404 }
      );
    }

    const headers = new Headers({
      // From the ROW, never from `file.contentType`. What S3 reports is
      // whatever was written at upload time, and trusting it turns a
      // mislabelled object into a same-origin script.
      'Content-Type': photo.mimeType,
      'Content-Disposition': `inline; filename="${id}.${extension}"`,
      // `private`, so no shared cache ever holds a personal photograph. The id
      // never points at different bytes, so the lifetime can be long.
      'Cache-Control': 'private, max-age=31536000, immutable',
      // The bytes are an image and nothing else may reinterpret them.
      'X-Content-Type-Options': 'nosniff',
    });

    if (file.contentLength !== undefined) {
      headers.set('Content-Length', String(file.contentLength));
    }

    return new Response(file.body, { status: 200, headers });
  } catch (error) {
    logger.error(`Serve day photo error: ${getErrorMessage(error)}`);
    return Response.json(
      { success: false, errorMsg: 'Not found' },
      { status: 404 }
    );
  }
}
