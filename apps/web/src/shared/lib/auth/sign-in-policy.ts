import {
  ADMIN_OAUTH_PROVIDER_IDS,
  isAdminOAuthProviderId,
} from '@/shared/lib/auth/admin-oauth-providers';
import { isSiteOwnerEmail } from '@/shared/lib/auth/site-owner';

/**
 * Who may sign in, from what Auth.js gives the `signIn` callback. Apart from
 * `./auth.ts` (stubbed under `bun test`) so it can be tested. Account linking
 * makes the email address the credential, so it must be verified.
 */
export type SignInDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export type SignInInput = {
  user: { email?: string | null };
  account?: { provider: string; type: string } | null;
  profile?: { email_verified?: unknown } | null;
};

const GITHUB_PROVIDER_IDS: ReadonlySet<string> = new Set([
  'github',
  ADMIN_OAUTH_PROVIDER_IDS.GITHUB,
]);
const GOOGLE_PROVIDER_IDS: ReadonlySet<string> = new Set([
  'google',
  ADMIN_OAUTH_PROVIDER_IDS.GOOGLE,
]);

const ALLOWED: SignInDecision = { allowed: true };

const refuse = (reason: string): SignInDecision => ({ allowed: false, reason });

export function evaluateSignIn({
  user,
  account,
  profile,
}: SignInInput): SignInDecision {
  if (!account) {
    return ALLOWED;
  }

  // Owner-only, but `POST /api/auth/signin/email` is open to anyone. Runs on
  // request (before any mail is sent) and on redemption.
  if (account.type === 'email' && !isSiteOwnerEmail(user.email)) {
    return refuse('email sign-in is limited to the site owner');
  }

  // GitHub's profile has `email_verified` only via `fetchGitHubProfile`.
  if (
    (GOOGLE_PROVIDER_IDS.has(account.provider) ||
      GITHUB_PROVIDER_IDS.has(account.provider)) &&
    profile?.email_verified !== true
  ) {
    return refuse(`${account.provider} did not report a verified email`);
  }

  // A UX gate (clear refusal, not a silent bounce); `getAuthenticatedAdmin()`
  // is the boundary.
  if (
    isAdminOAuthProviderId(account.provider) &&
    !isSiteOwnerEmail(user.email)
  ) {
    return refuse(`${account.provider} identity is not the site owner`);
  }

  return ALLOWED;
}
