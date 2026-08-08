'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { getAuthenticatedUser, normalizeEmail } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Attach the signed-in user to every grant issued to their address.
 *
 * Called once from `(shared)/layout.tsx` — the one funnel every shared route
 * passes through. NOT from `getSharedInbox`, because a recipient arriving
 * straight from the invitation email lands on `/shared/notes/[id]` and never
 * touches the inbox, which would leave the owner's dialog reading `Pending`
 * forever. And not from `resolveNoteAccess`, which runs on every shared
 * request and is the wrong place to hang a write.
 *
 * Idempotent by construction: one `updateMany` over the rows not yet claimed.
 * Failure is logged and swallowed — this powers a label in the owner's dialog
 * and nothing else, and it must never cost a recipient their page.
 */
export async function claimNoteShares(): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    const email = normalizeEmail(user?.email);

    if (!user || !email) {
      return;
    }

    await prisma.noteShare.updateMany({
      where: { email, recipientId: null },
      data: { recipientId: user.id },
    });
  } catch (error) {
    logger.warn(`Claim note shares failed: ${getErrorMessage(error)}`);
  }
}
