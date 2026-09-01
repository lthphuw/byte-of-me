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

/** Attach the address. The bucket is private, so the URL is not a property
 *  of the object but the route that serves it after a session check —
 *  built on read, so no column of dead public URLs accumulates. */
export function toDayPhotoRow(photo: StoredPhoto): DayPhotoRow {
  return { ...photo, url: `/api/health/photos/${photo.id}` };
}
