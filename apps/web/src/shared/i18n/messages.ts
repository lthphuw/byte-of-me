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
 * `/space` then carries the same argument one level deeper — its four
 * namespaces are as unrelated to each other as `dashboard` and `space` were,
 * and each module has its own layout — so the vault mounts a second provider
 * per module. See `SPACE_SHELL_MESSAGE_NAMESPACES` and the three lists under
 * it.
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

/**
 * The floor under every `/space` provider.
 *
 * It exists because nested providers REPLACE `messages` rather than merging
 * them (see the header note). The vault mounts four providers — the shell's
 * and one per module — and a module's provider is the only one its subtree
 * can see, so each has to carry the shared copy again. Spread this constant
 * instead of retyping the three names: written out four times they drift,
 * and the failure mode is a raw key path on screen rather than a build error.
 *
 * Repeating it costs nothing on the wire, which is worth knowing before anyone
 * "optimizes" a namespace back out of a nested list. `pickMessages` assigns the
 * leaf BY REFERENCE out of the one catalogue the request resolved, so both
 * providers hand React the identical object and the flight stream emits it once
 * and references it thereafter. Measured on the running dev server: fetch
 * `/en/space/gym` with `RSC: 1` and each of these three namespaces' strings
 * appears exactly once in the payload, not twice. What a route actually pays
 * for is the UNION of every provider above it — which is why the split is worth
 * anything at all, and why a duplicated namespace is not.
 *
 * `components` and `error` are both carried on faith rather than on evidence,
 * and deliberately so. Nothing under `/space` reads `components` today and the
 * only `error` reader is `attachment-row.tsx`; `app/[locale]/error.tsx`, the
 * one error boundary in the tree, renders under the LOCALE root's provider,
 * not this one. Both namespaces are under a kilobyte together — cheap enough
 * that the alternative (a new `error.tsx` under a module, or a shared widget
 * that reaches for `components.*`, rendering its own key paths) is the more
 * expensive bet.
 */
const SPACE_BASE_MESSAGE_NAMESPACES = [
  'components',
  'error',
  'global',
] as const;

/**
 * The vault SHELL (`space/layout.tsx`) — the chrome, not the modules.
 *
 * This used to be the union of all four vault namespaces, mounted once here,
 * which is the same mistake the `(protected)` split above fixed one level up:
 * `dashboard.gym` is 14.8 KB and `dashboard.note` 8.5 KB of `en.json`, and the
 * hub — which renders a nav rail and four cards — was receiving both, plus
 * `dashboard.daily`, on every navigation. Measured from `en.json` as the union
 * each route ends up paying for: 36.1 KB on every `/space` route before, and
 * after — hub 8.0 KB, daily 12.9 KB, notes 16.5 KB, gym 22.7 KB.
 *
 * What stays here is what renders ABOVE those nested providers and therefore
 * still reads this one: `SpaceShell` and everything it owns — the rail
 * (`use-space-nav-items.ts`, `space-nav-rail.tsx`), the settings dialog it
 * hosts around both panes (`workspace-settings-dialog.tsx`,
 * `maintenance-panel.tsx`), the skip link and the two toggles — plus the hub
 * page and `space/loading.tsx`'s `SpaceHubSkeleton`. Every one of those reads
 * `dashboard.space.*` or `global.*` and nothing else from the CMS.
 */
export const SPACE_SHELL_MESSAGE_NAMESPACES = [
  ...SPACE_BASE_MESSAGE_NAMESPACES,
  'dashboard.space',
] as const;

/**
 * `/space/gym/**` (`space/gym/layout.tsx`). `dashboard.gym` is the whole
 * module: the catalogue and its filters, routines, the live logger and the
 * session editor, the stats charts and every screen's skeleton.
 *
 * No `dashboard.space`, and the layout's own header is rendered OUTSIDE this
 * provider to keep it that way — the header is `SpaceNavTrigger`, which is
 * shell chrome, and this list should say what the MODULE reads. Note that this
 * is a statement about the list, not a saving: `dashboard.space` is already on
 * the wire from the shell's provider, so adding it here would cost nothing (see
 * the floor's note on reference dedupe). If a gym screen ever renders the
 * trigger inside `{children}` — the way both notes screens do — add
 * `dashboard.space` here and move the header inside; nothing will fail loudly
 * if you forget, the hamburger will simply be labelled `dashboard.space.openNav`.
 */
export const SPACE_GYM_MESSAGE_NAMESPACES = [
  ...SPACE_BASE_MESSAGE_NAMESPACES,
  'dashboard.gym',
] as const;

/** `/space/daily` (`space/daily/layout.tsx`). `dashboard.daily` covers the
 *  month board, the day journal modal, the sleep form and the sleep charts.
 *  Same header arrangement as gym, and the same caveat applies: the trigger
 *  stays above the provider, so this list stays free of `dashboard.space`. */
export const SPACE_DAILY_MESSAGE_NAMESPACES = [
  ...SPACE_BASE_MESSAGE_NAMESPACES,
  'dashboard.daily',
] as const;

/**
 * `/space/notes/**` (`space/notes/layout.tsx`) — the workspace AND the graph.
 *
 * Mounted at `notes/`, not at `notes/(workspace)/`, because the graph is a
 * sibling of that group, not a member of it: `notes/graph/page.tsx` renders
 * `SpaceGraphScreen` and `notes/graph/loading.tsx` is a client component, and
 * both read `dashboard.note.graph`. A provider inside `(workspace)/` would
 * leave them resolving against the shell's list, which no longer carries
 * `dashboard.note` — a knowledge graph titled `dashboard.note.graph.title`.
 *
 * `dashboard.space` IS carried here, unlike gym and daily, and the reason is
 * structural rather than a matter of taste: both of this module's screens
 * render `SpaceNavTrigger` from INSIDE their own tree — the workspace takes it
 * as `navSlot` and draws it in the explorer header, the graph screen composes
 * it directly — so it resolves against this provider, and without the
 * namespace the phone hamburger's label and every drawer entry render as key
 * paths. The repetition is free: the shell's provider already put that object
 * in the payload and the flight stream references it rather than re-emitting
 * it, so this route's union is 16.5 KB against the old 36.1 KB.
 */
export const SPACE_NOTES_MESSAGE_NAMESPACES = [
  ...SPACE_BASE_MESSAGE_NAMESPACES,
  'dashboard.note',
  'dashboard.space',
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
