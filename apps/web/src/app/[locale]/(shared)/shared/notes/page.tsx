import { getLocale } from 'next-intl/server';

import { redirect } from '@/shared/i18n/navigation';

/**
 * `/shared/notes` with no note named.
 *
 * Sent to the inbox rather than given a list of its own: the two would show
 * the same thing, and a surface whose whole job is "here is exactly what you
 * were given" should have exactly one place that says it. Without this the
 * route 404'd — the layout above renders on it, but a segment with no page
 * is not a route at all.
 */
export default async function SharedNotesIndexPage() {
  redirect({ href: '/shared', locale: await getLocale() });
}
