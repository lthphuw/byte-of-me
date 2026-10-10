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
 *  interactions (`auth`), list/detail widgets and the shared `components` copy.
 *  `contact` is here for `ContactForm`, a client component. */
export const PUBLIC_MESSAGE_NAMESPACES = [
  'auth',
  'blog',
  'blogDetails',
  'components',
  'contact',
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

/**
 * `(protected)` has no provider of its own — `dashboard/` mounts one narrowed
 * to what the CMS renders, because the `dashboard` namespace is large and the
 * group is `force-dynamic`, so anything mounted at the group root ships on every
 * request. `global` is carried because the shell reuses the same toggles the
 * public header exposes.
 */
export const DASHBOARD_MESSAGE_NAMESPACES = [
  'components',
  // Leaf by leaf rather than plain `dashboard`, so a new sub-namespace does
  // not silently join the CMS payload. `dashboard.dashboard` is absent
  // because the home page's stats/profile/analytics blocks are all RSCs on
  // `getTranslations`, which resolves from the request config, not from here.
  'dashboard.blog',
  'dashboard.comment',
  'dashboard.common',
  'dashboard.company',
  'dashboard.contactGallery',
  'dashboard.education',
  'dashboard.featuredWorks',
  'dashboard.media',
  'dashboard.project',
  'dashboard.shared',
  'dashboard.sidebar',
  'dashboard.tag',
  'dashboard.techStack',
  'dashboard.userProfile',
  'error',
  'global',
] as const;

/**
 * The public print view (`/print/blogs/[slug]`): one button label.
 *
 * `dashboard` is deliberately absent — the same reason it is absent from
 * the other public lists. This page is anonymous, and a visitor has no
 * business receiving the CMS's vocabulary in their RSC payload. The page renders
 * `BlogPrintTrigger`, which reads `blogDetails`.
 */
export const PUBLIC_PRINT_MESSAGE_NAMESPACES = ['blogDetails'] as const;

type MessageGroup = Record<string, unknown>;

function isMessageGroup(value: unknown): value is MessageGroup {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow a resolved catalogue to the given namespaces, each either a top-level
 * name (`global`) or a dotted path (`dashboard.media`). A dotted path keeps the
 * enclosing objects, so `useTranslations('dashboard.media')` still resolves;
 * siblings listed separately merge into one branch. Kept inline rather than
 * pulling in a `pick` dependency; missing namespaces are skipped so a locale
 * file that lags behind `en.json` still renders.
 */
export function pickMessages(
  messages: Record<string, unknown>,
  namespaces: readonly string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const namespace of namespaces) {
    const segments = namespace.split('.');
    const leaf = segments[segments.length - 1];
    let source: MessageGroup = messages;
    let target = picked;
    let reachable = true;

    for (const segment of segments.slice(0, -1)) {
      const next = source[segment];

      if (!isMessageGroup(next)) {
        reachable = false;
        break;
      }

      // Copy rather than reuse an existing branch: it may be a whole namespace
      // picked by reference on an earlier pass, and writing the leaf into it
      // would mutate the request's shared catalogue.
      const existing = target[segment];
      const branch = isMessageGroup(existing) ? { ...existing } : {};

      target[segment] = branch;
      source = next;
      target = branch;
    }

    if (reachable && leaf in source) {
      target[leaf] = source[leaf];
    }
  }

  return picked;
}
