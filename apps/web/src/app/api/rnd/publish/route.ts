import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { timingSafeEqual } from 'node:crypto';

// Imported by path, not through the slice barrel. `publish-rnd-project` is
// deliberately absent from `entities/note/api/index.ts` — it has no
// `'use server'` shield, and starring it into the barrel drags `prisma` into
// client bundles and breaks the build. See the comment in that barrel.
import { publishRndProject } from '@/entities/note/api/publish-rnd-project';
import { rndPublishSchema } from '@/entities/note/model/rnd-publish-schema';
import { env } from '@/shared/config/env';
import { normalizeEmail } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';

/**
 * Ingest for the R&D notebook: `rnd-publish` on a developer machine POSTs a
 * whole project's markdown here.
 *
 * A route handler rather than a server action because the caller has no
 * session — it holds a long-lived token instead. That is also why the two
 * services it calls carry an explicit `ownerId` instead of a `requireAdmin()`
 * guard.
 */
export const runtime = 'nodejs';

/**
 * Whether the request may publish.
 *
 * Exported for its test. Constant-time on the comparison, and **fail-closed on
 * an unset token**: an env var that has not been configured yet must lock the
 * route, never open it. Length is compared first because `timingSafeEqual`
 * throws on mismatched buffers, and that throw is itself a length oracle.
 */
export function isAuthorizedRndToken(
  header: string | null,
  configured: string | undefined
): boolean {
  if (!configured) return false;
  if (!header?.startsWith('Bearer ')) return false;

  const supplied = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(configured);

  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
}

export async function POST(request: Request): Promise<Response> {
  if (
    !isAuthorizedRndToken(request.headers.get('authorization'), env.RND_PUBLISH_TOKEN) ||
    !env.RND_PUBLISH_OWNER_EMAIL
  ) {
    return Response.json({ success: false, errorMsg: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return Response.json(
      { success: false, errorMsg: `Malformed JSON: ${getErrorMessage(error)}` },
      { status: 400 }
    );
  }

  const parsed = parseInput(rndPublishSchema, body);
  if (!parsed.ok) {
    return Response.json({ success: false, errorMsg: parsed.errorMsg }, { status: 400 });
  }

  const owner = await prisma.user.findFirst({
    where: { email: normalizeEmail(env.RND_PUBLISH_OWNER_EMAIL) },
    select: { id: true },
  });

  if (!owner) {
    logger.error('RND_PUBLISH_OWNER_EMAIL does not match any user');
    return Response.json({ success: false, errorMsg: 'Unauthorized' }, { status: 401 });
  }

  const result = await publishRndProject(owner.id, parsed.data);

  return Response.json(result, { status: result.success ? 200 : 500 });
}
