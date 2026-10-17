/**
 * Where the PUBLIC print view lives: its own route group `app/[locale]/(print)`, never
 * `(protected)`, so nothing here may be pointed at an admin query. Outside `(public)` because that
 * layout draws the site header, footer and reading shell, which a clean PDF must not inherit.
 */
const BLOG_PRINT_PATH = '/print/blogs';

/**
 * Href for a blog's print view, relative to the locale root (for `@/shared/i18n/navigation`). The
 * locale is required: each locale's `BlogTranslation` is another document. `?print=1` makes the
 * opened tab raise its own print dialog; the page never does unprompted.
 */
export function blogPrintHref(slug: string, autoPrint = true): string {
  const path = `${BLOG_PRINT_PATH}/${encodeURIComponent(slug)}`;
  return autoPrint ? `${path}?print=1` : path;
}
