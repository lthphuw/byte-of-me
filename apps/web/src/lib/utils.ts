import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureValidUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  if (/^(mailto:|tel:|javascript:)/i.test(url)) return url;

  return `https://${url}`;
}

export function prettyStringify(json: any) {
  return JSON.stringify(json, null, 2);
}

export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]+>/g, '');
  }

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
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
