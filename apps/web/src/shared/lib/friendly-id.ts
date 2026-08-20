import { customAlphabet } from 'nanoid';

/**
 * A short, URL-friendly id for the filename half of a storage key.
 *
 * The alphabet drops the lookalikes (0/O, 1/l) because these ids end up in
 * paths a human may have to read back off a screen or retype.
 *
 * In `shared/lib` rather than in the media slice that first needed it: note
 * attachments write storage keys too, and an entity may not reach into a
 * sibling entity's `lib/`. The alternative on offer was a second copy of the
 * same twelve characters, which is how two id alphabets quietly drift apart.
 */
const nanoidFriendly = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export const generateFriendlyId = (): string => nanoidFriendly();
