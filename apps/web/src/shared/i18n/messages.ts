/**
 * Per-route-group client message scoping: NextIntlClientProvider serializes `messages` into each page's
 * RSC payload, so a group mounts only the namespaces its **client** components read (server ones use
 * getTranslations). Nested providers replace, not merge, so every list needs its own `error`.
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
 * `(protected)` has no provider; `dashboard/` mounts one narrowed to the CMS, since the `dashboard`
 * namespace is large and the group is force-dynamic. `global` is carried for the shell's toggles.
 */
export const DASHBOARD_MESSAGE_NAMESPACES = [
  'components',
  // Leaf by leaf so a new sub-namespace does not silently join the CMS payload. `dashboard.dashboard`
  // is absent: its blocks are RSCs on `getTranslations`, which resolves from the request config.
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
  'dashboard.validation',
  'error',
  'global',
] as const;

/**
 * Public print view (`/print/blogs/[slug]`): one button label (`BlogPrintTrigger`, `blogDetails`).
 * `dashboard` is absent for the usual reason: anonymous visitors must not receive the CMS vocabulary.
 */
export const PUBLIC_PRINT_MESSAGE_NAMESPACES = ['blogDetails'] as const;

type MessageGroup = Record<string, unknown>;

function isMessageGroup(value: unknown): value is MessageGroup {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow a catalogue to namespaces, top-level (`global`) or dotted (`dashboard.media`). A dotted path
 * keeps its parents and siblings merge; missing ones are skipped so a locale lagging `en.json` renders.
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
