import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';



import { env } from '@/env.mjs';





export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:|javascript:)/i.test(url)) return url;

  return `https://${url}`;
}

export function formatDate(
  input: Date | string | number | null | undefined
): string {
  if (!input) return 'Unknown';

  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateDuration(
  startDate?: Date | null,
  endDate?: Date | null
): string {
  if (!startDate) return 'Unknown';

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  if (months < 0) return 'Invalid';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const yearStr = years > 0 ? `${years}y` : '';
  const monthStr = remainingMonths > 0 ? `${remainingMonths}m` : '';

  return [yearStr, monthStr].filter(Boolean).join(' ') || '0m';
}

export function absoluteUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`;
}

export function prettyStringify(json: any) {
  return JSON.stringify(json, null, 2);
}