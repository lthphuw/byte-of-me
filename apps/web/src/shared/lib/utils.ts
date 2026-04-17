import { type ClassValue,clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { env } from '@/shared/config/env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:|javascript:)/i.test(url)) return url;

  return `https://${url}`;
}

export function prettyStringify(json: Any) {
  return JSON.stringify(json, null, 2);
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

/**
 * For debugging
 * @param ms
 */
export async function delay(ms: number) {
  if (env.NODE_ENV !== 'production') {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
