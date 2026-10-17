/**
 * Shared shape for the GitHub and Google sign-in buttons.
 *
 * Both surfaces render the same two buttons, so the props live here rather than
 * being declared twice and drifting.
 */
export interface AuthButtonProps {
  className?: string;

  /**
   * Where to return once the provider redirects back. Defaults to the current
   * pathname, which is what the public comment modal wants — a reader who signs
   * in to comment should land back on the post they were reading.
   */
  callbackUrl?: string;

  /**
   * Which audience the button serves. `'admin'` uses the owner-gated provider ids
   * (`ADMIN_OAUTH_PROVIDER_IDS`), so a stranger is refused at the `signIn` callback instead of
   * getting a `USER` session that bounces off protected routes. `'public'` is the default.
   */
  surface?: 'public' | 'admin';
}
