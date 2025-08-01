import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:|javascript:)/i.test(url)) return url;

  return `https://${url}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prettyStringify(json: any) {
  return JSON.stringify(json, null, 2);
}
