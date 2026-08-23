import type { DayPhotoRow } from '@/entities/day-entry/model/types';

/** What a photo row looks like coming out of Prisma, before the route path is
 *  attached. */
export interface StoredPhoto {
  id: string;
  caption: string | null;
  position: number;
  mimeType: string;
  size: number;
}

/**
 * Attach the address.
 *
 * The bucket is private, so a photo's URL is not a property of the object —
 * it is the route that will serve it after checking the session. Building it
 * on read rather than storing it is what stops a column of dead public URLs
 * accumulating, and what makes moving the route a one-line change.
 */
export function toDayPhotoRow(photo: StoredPhoto): DayPhotoRow {
  return { ...photo, url: `/api/health/photos/${photo.id}` };
}
