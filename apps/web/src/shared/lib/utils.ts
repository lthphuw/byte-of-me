// eslint-disable-next-line import/no-duplicates
import { formatDistanceToNow } from 'date-fns';
// eslint-disable-next-line import/no-duplicates
import { enUS, vi } from 'date-fns/locale';


export { cn } from '@byte-of-me/ui';

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

export function formatDate(
  dateString: string | Date | undefined | null,
  locale = 'en-US'
) {
  if (!dateString) return null;
  const date = new Date(dateString);

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getRelativeTime(date: Date, locale: string) {
  const dateObj = new Date(date);
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: locale === 'vi' ? vi : enUS,
  });
}
