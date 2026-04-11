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
