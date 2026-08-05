/**
 * Per-route-group scoping of the client message catalogue.
 *
 * `NextIntlClientProvider` serializes whatever it gets as `messages` into the
 * RSC payload of every page below it. Mounting it at the locale root with the
 * full catalogue meant a marketing page shipped the `dashboard`, `auth` and
 * `email` namespaces to every visitor, so each route group now mounts its own
 * provider with only the namespaces its **client** components read. Server
 * components use `getTranslations`, which resolves from the request config and
 * never touches the provider — they don't constrain these lists.
 *
 * Nested providers replace `messages` instead of merging them (use-intl's
 * `IntlProvider` only falls back to the parent value when the prop is
 * `undefined`), so every list below has to be self-sufficient — including the
 * `error` namespace, which any nested `error.tsx` boundary inside the group
 * needs.
 */

/** Namespaces reachable from the locale root itself, outside the route groups:
 *  `app/[locale]/error.tsx` renders there and is a client component. */
export const ROOT_MESSAGE_NAMESPACES = ['error'] as const;

/** Public site: header/footer toggles (`global`), the sign-in modal behind blog
 *  interactions (`auth`), list/detail widgets and the shared `components` copy. */
export const PUBLIC_MESSAGE_NAMESPACES = [
  'auth',
  'blog',
  'blogDetails',
  'components',
  'error',
  'global',
  'project',
] as const;

/** Login screen: the auth form plus the public footer it reuses. */
export const AUTH_MESSAGE_NAMESPACES = [
  'auth',
  'components',
  'error',
  'global',
] as const;

/** Dashboard. `global` is carried conservatively: the group is behind an auth
 *  redirect so it can't be smoke-tested anonymously, and its shell reuses the
 *  same toggles the public header exposes. */
export const PROTECTED_MESSAGE_NAMESPACES = [
  'components',
  'dashboard',
  'error',
  'global',
] as const;

/** The print view (`/print/notes/[id]`): one button label, nothing else.
 *  Narrower than the protected list on purpose — the page renders no chrome,
 *  and there is no `error.tsx` beneath it to widen this for. */
export const PRINT_MESSAGE_NAMESPACES = ['dashboard'] as const;

/**
 * Narrow a resolved catalogue to the given top-level namespaces. Kept inline
 * rather than pulling in a `pick` dependency; missing namespaces are skipped so
 * a locale file that lags behind `en.json` still renders.
 */
export function pickMessages(
  messages: Record<string, unknown>,
  namespaces: readonly string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const namespace of namespaces) {
    if (namespace in messages) {
      picked[namespace] = messages[namespace];
    }
  }

  return picked;
}
