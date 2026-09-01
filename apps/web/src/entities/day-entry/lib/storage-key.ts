import { generateFriendlyId } from '@/shared/lib/friendly-id';

/**
 * `SUPABASE_S3_PRIVATE_BUCKET`, never the media bucket: that one answers an
 * anonymous GET with 200 (measured, `shared/api/s3-storage-api.ts`), which
 * would give every journal photo an address needing no session at all.
 *
 * The prefix is disjoint from the note-attachment prefix on purpose, so a
 * bucket listing says what each object is without a join.
 */
export function dayPhotoFileKey(
  ownerId: string,
  localDate: string,
  extension: string
): string {
  return `users/${ownerId}/health/days/${localDate}/${generateFriendlyId()}.${extension}`;
}
