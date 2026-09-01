/** One photo, as the client receives it. */
export interface DayPhotoRow {
  id: string;
  caption: string | null;
  position: number;
  mimeType: string;
  size: number;
  /** `/api/health/photos/<id>`, built on read and never stored — the bucket
   *  is private, so a persisted URL would render as a broken image. */
  url: string;
}

/** One day, as the client receives it. Dates are `YYYY-MM-DD` strings: a
 *  server action's return value is serialized, so `Date` would arrive as a
 *  string while the type claimed otherwise. */
export interface DayEntryRow {
  id: string;
  localDate: string;
  mood: number | null;
  reflection: string | null;
  photos: DayPhotoRow[];
}
