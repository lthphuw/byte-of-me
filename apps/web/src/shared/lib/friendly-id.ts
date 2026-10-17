import { customAlphabet } from 'nanoid';

/**
 * A short URL-friendly id for the filename half of a storage key; the alphabet drops lookalikes
 * (0/O, 1/l) for ids a human may retype. In `shared/lib` so entities share one alphabet, not copies.
 */
const nanoidFriendly = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export const generateFriendlyId = (): string => nanoidFriendly();
