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
import { isSiteOwnerEmail, normalizeEmail } from '@/shared/lib/auth';
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
 * Worst case (`files` and `deleted` both at their 200-item cap):
 * `publishRndProject`'s own transaction timeout can reach roughly 213s
 * (`BASE_MS` + 200 × 6 round trips + 200 archive round trips, at 150ms each
 * — see that file), plus its `maxWait` of 10s, plus the markdown-parsing
 * pass that now runs before the transaction opens. Without a `maxDuration`
 * here, the platform's own function timeout — which defaults well under
 * that — would cut the request off first, so the caller would see a
 * generic gateway timeout instead of the transaction's own, more legible,
 * failure. 300s covers the worst case with headroom; if this is ever
 * deployed on a plan whose function-duration ceiling is lower than that,
 * raise the ceiling rather than shrinking this number, or large publishes
 * will fail below `publishRndProject`'s own limit.
 */
export const maxDuration = 300;

/**
 * The floor below which a configured token is treated as no token at all.
 *
 * `env.ts`'s `RND_PUBLISH_TOKEN` deliberately carries no `.min()` — a
 * set-but-short value there would fail env validation at import time and
 * take the whole site down at boot over one route's config typo (see the
 * comment on that field). This is where the same 32-character floor is
 * actually enforced: as a security property of this one route, checked at
 * request time, so a misconfigured token 401s every publish instead of
 * crashing the deployment.
 */
const MIN_TOKEN_LENGTH = 32;

/**
 * Whether the request may publish.
 *
 * Exported for its test. Constant-time on the comparison, and **fail-closed on
 * an unset OR too-short token**: an env var that has not been configured yet,
 * or has been set to something shorter than `MIN_TOKEN_LENGTH`, must lock the
 * route, never open it. Length is compared first because `timingSafeEqual`
 * throws on mismatched buffers, and that throw is itself a length oracle.
 */
export function isAuthorizedRndToken(
  header: string | null,
  configured: string | undefined
): boolean {
  if (!configured || configured.length < MIN_TOKEN_LENGTH) return false;
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

  // Every OTHER path into the vault routes through `isSiteOwnerEmail()` —
  // `getAuthenticatedAdmin()`, the sign-in form's own gate, and the admin
  // OAuth `signIn` callback all call it, and `docs/notes.md` §1 states the
  // vault is identity-gated, not role-gated: "even a second ADMIN row cannot
  // enter." This route is the one write path that never had a session to
  // check, so nothing else asserted that invariant for it — a typo in
  // `RND_PUBLISH_OWNER_EMAIL` naming another registered user would publish a
  // whole notebook into THEIR private vault and let the archive pass touch
  // their notes. Asserted here, before the owner lookup below (and before
  // body parsing, since this depends only on configuration, not on the
  // request), so a misconfigured deployment fails exactly like every other
  // misconfiguration on this route: 401, not a 500 or a wrong-vault write.
  if (!isSiteOwnerEmail(env.RND_PUBLISH_OWNER_EMAIL)) {
    logger.error('RND_PUBLISH_OWNER_EMAIL is not the site owner address');
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

  // Case-insensitive: `User.email` is written by Auth.js from the
  // provider's raw value, and nothing in this repo lowercases it on the way
  // in. `normalizeEmail()` already lowercases the CONFIGURED address, but an
  // exact match still 401s the owner permanently the day their GitHub
  // address happens to be stored as `Lthphuw@gmail.com`.
  const owner = await prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(env.RND_PUBLISH_OWNER_EMAIL), mode: 'insensitive' } },
    select: { id: true },
  });

  if (!owner) {
    logger.error('RND_PUBLISH_OWNER_EMAIL does not match any user');
    return Response.json({ success: false, errorMsg: 'Unauthorized' }, { status: 401 });
  }

  const result = await publishRndProject(owner.id, parsed.data);

  return Response.json(result, { status: result.success ? 200 : 500 });
}
