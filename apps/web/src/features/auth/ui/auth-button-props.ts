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
   * Which audience the button is serving.
   *
   * `'admin'` routes through the owner-gated provider ids (see
   * `ADMIN_OAUTH_PROVIDER_IDS`), so a stranger is refused at the `signIn`
   * callback instead of receiving a `USER` session that then bounces off every
   * protected route. `'public'` is the default so the comment modal keeps its
   * existing behaviour untouched.
   */
  surface?: 'public' | 'admin';
}
