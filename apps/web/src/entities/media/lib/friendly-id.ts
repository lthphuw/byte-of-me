import { customAlphabet } from 'nanoid';

/**
 * A short, URL-friendly id for the filename half of a storage key.
 *
 * The alphabet drops the lookalikes (0/O, 1/l) because these ids end up in
 * paths a human may have to read back off a screen or retype.
 */
const nanoidFriendly = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export const generateFriendlyId = (): string => nanoidFriendly();
