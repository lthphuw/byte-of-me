import { customAlphabet, nanoid } from 'nanoid';





/**
 * Standard UUID-like string (21 characters by default)
 */
export const generateId = (size?: number): string => {
  return nanoid(size);
};

/**
 * Generates a shorter ID specifically for UI elements or slugs
 */
export const generateShortId = (): string => {
  return nanoid(10);
};

/**
 * Generates a numeric-only ID (useful for OTPs or reference numbers)
 */
export const generateNumericId = (length: number = 6): string => {
  const nanoidNumeric = customAlphabet('0123456789', length);
  return nanoidNumeric();
};

/**
 * Generates a URL-friendly, lowercase alphanumeric ID
 * Avoids lookalike characters like 0, O, 1, l
 */
export const generateFriendlyId = (length: number = 12): string => {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  const nanoidFriendly = customAlphabet(alphabet, length);
  return nanoidFriendly();
};

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');
  clean = clean.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '');

  const allowedTags =
    /<\/?(b|i|em|strong|p|br|h1|h2|h3|h4|ul|ol|li|blockquote|code|pre|a|img|div|span)\b[^>]*>/gim;

  clean = clean.replace(/<[^>]+>/g, (tag) => {
    return tag.match(allowedTags) ? tag : '';
  });

  clean = clean.replace(/\s(on\w+)\s*=\s*["'][^"']*["']/gim, '');
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gim, 'href="#"');

  return clean.trim();
}
