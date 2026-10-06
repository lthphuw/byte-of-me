import { logger } from '@byte-of-me/logger';
import { headers } from 'next/headers';

import { getClientIp } from '@/shared/lib/client-ip';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Bounds sign-in mail per client IP, so anyone cannot flood the owner's inbox
 * or burn SMTP quota. Never per address: a stranger could then lock the owner
 * out. Fails open.
 */
export async function isMagicLinkRequestAllowed(
  readHeaders: () => Promise<Pick<Headers, 'get'>> = headers
): Promise<boolean> {
  try {
    const { allowed } = await checkRateLimit({
      key: `magic-link:${getClientIp(await readHeaders())}`,
      limit: 5,
      windowSec: 600,
    });

    return allowed;
  } catch (error) {
    logger.warn(`Magic-link rate limit skipped: ${getErrorMessage(error)}`);
    return true;
  }
}
