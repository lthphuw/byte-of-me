/**
 * Admin OAuth button ids: the same OAuth apps as public github/google, but the signIn callback gets
 * no callback URL, so the id is its only surface signal. Register the parent `/api/auth/callback`
 * (ids change the redirect URI). Kept apart from auth.ts, which the test preload stubs wholesale.
 */
export const ADMIN_OAUTH_PROVIDER_IDS = {
  GITHUB: 'github-admin',
  GOOGLE: 'google-admin',
} as const;

export function isAdminOAuthProviderId(providerId: string): boolean {
  return ADMIN_OAUTH_PROVIDER_ID_SET.has(providerId);
}

const ADMIN_OAUTH_PROVIDER_ID_SET: ReadonlySet<string> = new Set(
  Object.values(ADMIN_OAUTH_PROVIDER_IDS)
);
