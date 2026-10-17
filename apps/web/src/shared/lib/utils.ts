import { formatDistanceToNow, isAfter, isSameDay } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';

// From `@byte-of-me/ui-utils`, never the `@byte-of-me/ui` barrel: the barrel
// pulls the component library into routes with no UI, and /api/og then fails
// its build with a module-init-order error.
export { cn } from '@byte-of-me/ui-utils';

/**
 * Makes a stored address safe to put in an `href`: http(s), `mailto:` and
 * `tel:` pass through, a bare host gets `https://`, and any other scheme
 * (`javascript:`, `data:`, `vbscript:`, ...) collapses to `#`.
 */
export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:)/i.test(url)) return url;

  // `example.com:8080/x` is a host and port, not a scheme.
  const isHostWithPort = /^[^\s:/?#]+:\d+(?:[/?#]|$)/.test(url);
  if (!isHostWithPort && /^[a-z][a-z0-9+.-]*:/i.test(url)) return '#';

  return `https://${url}`;
}

export function prettyStringify(json: unknown) {
  return JSON.stringify(json, null, 2);
}

export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

export function formatImageSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
    ' ' +
    ['Bytes', 'KB', 'MB'][i]
  );
}

/**
 * Month + year by default; pass `options` for a fuller date. The `en-US` default shows "Jan 2024" to a
 * `vi` reader: client components use next-intl's `useFormatter().dateTime()`; elsewhere pass `locale`.
 */
export function formatDate(
  dateString: string | Date | undefined | null,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
) {
  if (!dateString) return null;
  const date = new Date(dateString);

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Whether `updatedAt` is worth showing beside the post date. Compared by CALENDAR DAY: every save bumps
 * `updatedAt`, so same-day edits would stamp "Updated" with the post's own date. Inputs are widened to
 * string because a Next data-cache hit returns Dates serialized (blogs/[slug]/page.tsx re-wraps them).
 */
export function isMeaningfullyUpdated(
  createdAt: string | Date | null | undefined,
  updatedAt: string | Date | null | undefined
): boolean {
  if (!createdAt || !updatedAt) return false;

  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) {
    return false;
  }

  return isAfter(updated, created) && !isSameDay(updated, created);
}

export function getRelativeTime(date: Date, locale: string) {
  const dateObj = new Date(date);
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: locale === 'vi' ? vi : enUS,
  });
}
