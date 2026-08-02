/**
 * Provider ids for the two OAuth buttons on `/auth/login`.
 *
 * They are separate registrations of the *same* OAuth applications as the
 * public `github` / `google` providers, and exist only so the `signIn` callback
 * in `./auth.ts` can tell the two audiences apart. That callback receives
 * `{ user, account, profile }` and no callback URL, so the provider id is the
 * only signal available about which surface a sign-in was started from —
 * without it, gating the admin buttons would also lock anonymous readers out of
 * commenting.
 *
 * Because the ids differ, the OAuth redirect URIs differ too
 * (`/api/auth/callback/github-admin`), and both must be registered with the
 * provider. GitHub OAuth Apps accept a single callback URL but match any
 * subdirectory of it, so registering the parent `/api/auth/callback` covers the
 * public and admin ids together without a second OAuth App.
 *
 * Kept in its own module, apart from `./auth.ts`, so it stays plain data: the
 * test preload stubs `./auth.ts` wholesale, and a constant declared there would
 * have to be hand-copied into that stub — the kind of second, drifting
 * definition `next-runtime-stubs.ts` deliberately avoids for `isSiteOwnerEmail`.
 */
export const ADMIN_OAUTH_PROVIDER_IDS = {
  GITHUB: 'github-admin',
  GOOGLE: 'google-admin',
} as const;

export type AdminOAuthProviderId =
  (typeof ADMIN_OAUTH_PROVIDER_IDS)[keyof typeof ADMIN_OAUTH_PROVIDER_IDS];

export function isAdminOAuthProviderId(providerId: string): boolean {
  return ADMIN_OAUTH_PROVIDER_ID_SET.has(providerId);
}

const ADMIN_OAUTH_PROVIDER_ID_SET: ReadonlySet<string> = new Set(
  Object.values(ADMIN_OAUTH_PROVIDER_IDS)
);
