import { z } from 'zod';

/**
 * Anonymous reads take ids and lists from the caller, who can post an object
 * such as `{ not: '' }`; Prisma reads that as a filter, not a value. Anything
 * headed for a `where` goes through these first.
 */

/** Prisma's default id (`@default(cuid())`): `c` plus 24 lowercase alphanumerics. */
export const CUID_PATTERN = /^c[a-z0-9]{20,32}$/;

export const cuidSchema = z.string().regex(CUID_PATTERN, 'Invalid id');

/** Filter chips on a list page are a handful; this bounds the OR/AND fan-out. */
export const MAX_FILTER_SLUGS = 10;
export const MAX_SLUG_LENGTH = 64;
export const MAX_SEARCH_LENGTH = 100;

export const slugSchema = z.string().min(1).max(MAX_SLUG_LENGTH);

export const slugListSchema = z.array(slugSchema).max(MAX_FILTER_SLUGS);

export const searchTextSchema = z.string().max(MAX_SEARCH_LENGTH);
