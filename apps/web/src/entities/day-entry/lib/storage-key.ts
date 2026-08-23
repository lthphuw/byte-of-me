import { generateFriendlyId } from '@/shared/lib/friendly-id';

/**
 * Where one day's photo lives in the PRIVATE bucket.
 *
 * `entities/media` writes to `SUPABASE_S3_STORAGE_BUCKET` and calls
 * `getPublicUrl`. That bucket answers an anonymous GET with 200 — measured,
 * not assumed, and recorded in `shared/api/s3-storage-api.ts`. Routing
 * personal journal photos through it would give every one of them an address
 * that works with no session at all, which is the whole thing `/space` exists
 * to prevent. These go to `SUPABASE_S3_PRIVATE_BUCKET` instead, the same
 * bucket note attachments already use.
 *
 * The prefix is disjoint from the note attachment prefix
 * (`users/<id>/notes/<noteId>/…`) on purpose: a bucket listing should say what
 * each object is without a join, and a day photo's key carries both its owner
 * and its date.
 */
export function dayPhotoFileKey(
  ownerId: string,
  localDate: string,
  extension: string
): string {
  return `users/${ownerId}/health/days/${localDate}/${generateFriendlyId()}.${extension}`;
}
