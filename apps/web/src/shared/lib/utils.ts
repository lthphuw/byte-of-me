 
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';


// Imported by its direct subpath, NOT from the package root. 96 files import
// this module and 45 of them only want `cn`; re-exporting it from the barrel
// made every one of them — including routes with no UI at all, such as
// /api/og — pull in the whole component library, tiptap included. That is what
// used to break the /api/og build with a module-init-order error.
export { cn } from '@byte-of-me/ui/lib/utils';

export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:|javascript:)/i.test(url)) return url;

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

/** Month + year by default; pass `options` for a fuller date (e.g. post dates). */
export function formatDate(
  dateString: string | Date | undefined | null,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
) {
  if (!dateString) return null;
  const date = new Date(dateString);

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function getRelativeTime(date: Date, locale: string) {
  const dateObj = new Date(date);
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: locale === 'vi' ? vi : enUS,
  });
}
