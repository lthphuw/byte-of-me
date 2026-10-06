import type { GitHubProfile } from 'next-auth/providers/github';

import { normalizeEmail } from '@/shared/lib/auth/normalize-email';

type GitHubEmail = { email: string; verified: boolean; primary: boolean };

/** The part of `fetch` this needs, so a spec can pass a plain function. */
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type GitHubUserinfoContext = {
  tokens: { access_token?: string };
  provider: { userinfo?: { url?: URL | string } };
};

/**
 * Auth.js's GitHub userinfo drops the `verified` flag, so an unconfirmed
 * address looks like a confirmed one. Same address choice as Auth.js, plus
 * `email_verified` from `/user/emails` (`false` if that list is unreadable).
 */
export async function fetchGitHubProfile(
  { tokens, provider }: GitHubUserinfoContext,
  fetchImpl: Fetcher = fetch
): Promise<GitHubProfile & { email_verified: boolean }> {
  const userUrl = String(provider.userinfo?.url);
  const init = {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'User-Agent': 'authjs',
    },
  };

  const profileRes = await fetchImpl(userUrl, init);
  if (!profileRes.ok) {
    throw new Error(`GitHub userinfo request failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as GitHubProfile;

  const emailsRes = await fetchImpl(`${userUrl}/emails`, init);
  const body: unknown = emailsRes.ok ? await emailsRes.json() : [];
  const emails = Array.isArray(body) ? (body as GitHubEmail[]) : [];

  const email =
    profile.email ||
    (emails.find((e) => e.primary) ?? emails[0])?.email ||
    null;
  const chosen = normalizeEmail(email);

  return {
    ...profile,
    email,
    email_verified:
      !!chosen &&
      emails.some(
        (e) => e.verified === true && normalizeEmail(e.email) === chosen
      ),
  };
}
