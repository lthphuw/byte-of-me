/**
 * Prisma `select` for a Media relation in an anonymous payload. Spreading the
 * whole row (`coverImage: true`) would also send the bucket, provider, storage
 * key and uploader id to every visitor; this is the `PublicMedia` shape.
 */
export const PUBLIC_MEDIA_SELECT = {
  id: true,
  url: true,
  width: true,
  height: true,
  mimeType: true,
} as const;
