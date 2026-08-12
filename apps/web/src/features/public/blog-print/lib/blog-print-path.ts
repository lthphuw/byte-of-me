/**
 * Where the PUBLIC print view lives.
 *
 * Its own route group (`app/[locale]/(print)`), not `(public)` and — this is
 * the part that matters — not `(protected)`. `/print/notes/[id]` sits under
 * `(protected)` behind `getAuthenticatedAdmin()` and reads through
 * `getAdminNoteById` + `requireAdmin`; blogs are anonymous content, so the
 * mechanism is reused and the route is not. Nothing here may ever be pointed
 * at an admin query.
 *
 * Outside `(public)` because that group's layout draws the site header, the
 * footer and the reading shell, and a page whose entire job is to become a
 * clean PDF must inherit none of it.
 */
export const BLOG_PRINT_PATH = '/print/blogs';

/**
 * Href for a blog's print view, relative to the locale root — pass it to the
 * `Link` / router from `@/shared/i18n/navigation`, which adds the prefix. The
 * locale is not optional here the way it is for a note: a blog body comes
 * from `BlogTranslation`, so `/vi/print/blogs/x` and `/en/print/blogs/x` are
 * two different documents.
 *
 * `?print=1` is what makes the opened tab raise its own print dialog. The
 * page does NOT do that unprompted — see `BlogPrintTrigger`.
 */
export function blogPrintHref(slug: string, autoPrint = true): string {
  const path = `${BLOG_PRINT_PATH}/${encodeURIComponent(slug)}`;
  return autoPrint ? `${path}?print=1` : path;
}
