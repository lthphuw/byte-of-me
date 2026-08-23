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
 * `(protected)` has no provider of its own — the three surfaces beneath it
 * (`dashboard/`, `space/`, `print/`) each mount their own, because the
 * `dashboard` namespace is 30 KB of `en.json` and the two big surfaces share
 * almost none of it: `/space` reads only `dashboard.daily`, `dashboard.gym`,
 * `dashboard.note` and `dashboard.space`, `/dashboard` reads everything else.
 * Mounted once at the group root, each was
 * shipping the other's copy on every navigation, and the group is
 * `force-dynamic` so that is per request, not per build.
 *
 * The split is safe only because every route under `(protected)` sits under one
 * of those three directories, and each has a layout to hang the provider on.
 *
 * `global` is carried conservatively on both: the group is behind an auth
 * redirect so it can't be smoke-tested anonymously, and both shells reuse the
 * same toggles the public header exposes.
 */
export const DASHBOARD_MESSAGE_NAMESPACES = [
  'components',
  // Leaf by leaf rather than plain `dashboard`, so a new vault-only
  // sub-namespace does not silently rejoin the CMS payload. `dashboard.note`
  // and `dashboard.space` are the vault's; `dashboard.dashboard` is absent
  // because the home page's stats/profile/analytics blocks are all RSCs on
  // `getTranslations`, which resolves from the request config, not from here.
  'dashboard.blog',
  'dashboard.comment',
  'dashboard.common',
  'dashboard.company',
  'dashboard.contactGallery',
  'dashboard.education',
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

/** The vault (`/space/**`). Its client tree reads `dashboard.daily` (the
 *  day journal, the sleep form and its charts), `dashboard.gym` (the
 *  catalogue, routines, workout sessions and stats), `dashboard.note`
 *  (editor, explorer, graph, share dialog) and `dashboard.space` (nav rail,
 *  hub skeleton, settings) and nothing else from the CMS's vocabulary. */
export const SPACE_MESSAGE_NAMESPACES = [
  'components',
  'dashboard.daily',
  'dashboard.gym',
  'dashboard.note',
  'dashboard.space',
  'error',
  'global',
] as const;

/** The print view (`/print/notes/[id]`): one button label, nothing else.
 *  Narrower than the vault list on purpose — the page renders no chrome, and
 *  there is no `error.tsx` beneath it to widen this for. */
export const PRINT_MESSAGE_NAMESPACES = ['dashboard.note'] as const;

/**
 * The public print view (`/print/blogs/[slug]`): one button label.
 *
 * `dashboard` is deliberately absent — the same reason it is absent from
 * `SHARE_MESSAGE_NAMESPACES`. This page is anonymous, and a visitor has no
 * business receiving the CMS's vocabulary in their RSC payload. That, plus
 * FSD's audience grouping, is why the page renders `BlogPrintTrigger`
 * (reading `blogDetails`) instead of reusing the dashboard's
 * `NotePrintTrigger`.
 */
export const PUBLIC_PRINT_MESSAGE_NAMESPACES = ['blogDetails'] as const;

/**
 * Everything under `/shared` — the recipient's reading surface.
 *
 * `dashboard` is deliberately absent: a recipient is not an admin, and
 * shipping that namespace would put the CMS's entire vocabulary into a
 * guest's RSC payload.
 */
export const SHARE_MESSAGE_NAMESPACES = [
  'components',
  'error',
  'global',
  'share',
] as const;

/**
 * `/invite`, the recipient's sign-in screen.
 *
 * The share list plus `auth`, and that addition is not cosmetic: the OAuth
 * buttons are the ones the public comment modal uses and they read
 * `auth.signInWithGithub` / `auth.signInWithGoogle` from inside. Without the
 * namespace both rendered their raw key path — a sign-in page telling the
 * visitor to press `auth.signInWithGithub`.
 *
 * Kept separate from the list above rather than widening it, because the
 * reading surface has no sign-in form on it and no reason to carry the copy.
 */
export const INVITE_MESSAGE_NAMESPACES = [
  ...SHARE_MESSAGE_NAMESPACES,
  'auth',
] as const;

type MessageGroup = Record<string, unknown>;

function isMessageGroup(value: unknown): value is MessageGroup {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow a resolved catalogue to the given namespaces, each either a top-level
 * name (`global`) or a dotted path (`dashboard.note`). A dotted path keeps the
 * enclosing objects, so `useTranslations('dashboard.note')` still resolves;
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
