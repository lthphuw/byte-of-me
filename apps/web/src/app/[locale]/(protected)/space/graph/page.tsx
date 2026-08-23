import { getLocale } from 'next-intl/server';

import { NOTE_GRAPH_HREF } from '@/entities/note';
import { redirect } from '@/shared/i18n/navigation';

/**
 * Where the knowledge graph used to live, before it was folded back under the
 * notes it plots (`/space/notes/graph`). It was never a module of its own —
 * it is a view of one — and it stopped being a peer of Notes and Health in the
 * nav rail at the same time.
 *
 * A page that redirects, rather than a `redirects()` entry in
 * `next.config.js`, for two reasons. It is locale-aware for free: `redirect`
 * from `@/shared/i18n/navigation` prefixes the target with the locale the
 * request already resolved, where a config rule would have to re-derive it
 * from a `/:locale` pattern that also matches anything else in that position.
 * And it is the shape this repo already uses for exactly this — see
 * `(shared)/shared/notes/page.tsx`, which redirects the same way.
 *
 * This exists only so an open tab or a bookmark of the author's does not 404;
 * the surface is `robots: noindex` and always has been, so there is no search
 * index to keep honest and no reason for the permanent (308) redirect a
 * config rule would default to.
 */
export default async function SpaceGraphRedirectPage() {
  redirect({ href: NOTE_GRAPH_HREF, locale: await getLocale() });
}
