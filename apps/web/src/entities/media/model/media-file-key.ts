import { generateFriendlyId } from '@/shared/lib/friendly-id';

import type { MediaScope } from './upload-constraints';

/**
 * Scope first, then date: grouping by what the file is FOR is the axis someone
 * browses by; the date only disambiguates within it.
 */
export function buildMediaFileKey(
  userId: string,
  scope: MediaScope,
  extension: string,
  now = new Date()
): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `users/${userId}/media/${scope}/${now.getFullYear()}/${month}/${generateFriendlyId()}.${extension}`;
}

const VIDEO_KEY_TAIL = /^[a-z-]+\/\d{4}\/\d{2}\/[a-z0-9]+\.(mp4|webm)$/;

/**
 * The extension of a video key this user's `prepareVideoUpload` could have
 * issued, else `null`. `finalizeVideoUpload` takes the key from the caller, so it
 * must not be steerable to another user's object or out of the media prefix.
 */
export function videoExtensionOfOwnKey(
  userId: string,
  fileKey: string
): 'mp4' | 'webm' | null {
  const prefix = `users/${userId}/media/`;
  if (!fileKey.startsWith(prefix)) return null;

  const match = VIDEO_KEY_TAIL.exec(fileKey.slice(prefix.length));

  return match ? (match[1] as 'mp4' | 'webm') : null;
}
