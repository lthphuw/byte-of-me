/** One photo, as the client receives it. */
export interface DayPhotoRow {
  id: string;
  caption: string | null;
  position: number;
  mimeType: string;
  size: number;
  /**
   * The route path this photo is served from — `/api/health/photos/<id>`.
   *
   * Built on read, never stored. The bucket is private, so there is no URL to
   * persist; a column holding one would be a value a future component renders
   * as a broken image.
   */
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
