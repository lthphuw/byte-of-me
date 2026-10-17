import { customAlphabet } from 'nanoid';

/**
 * A short, URL-friendly id for the filename half of a storage key.
 *
 * The alphabet drops the lookalikes (0/O, 1/l) because these ids end up in
 * paths a human may have to read back off a screen or retype.
 *
 * In `shared/lib` so any entity can mint a storage key: an entity may not reach
 * into a sibling entity's `lib/`, and a second copy of the alphabet is how two
 * id alphabets quietly drift apart.
 */
const nanoidFriendly = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export const generateFriendlyId = (): string => nanoidFriendly();
