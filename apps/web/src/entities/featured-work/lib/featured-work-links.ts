import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

/** The rows for a validated `links` array: a link's position is its array index. */
export function toLinkRows(
  links: NonNullable<FeaturedWorkFormValues['links']>
) {
  return links.map((link, sortOrder) => ({
    url: link.url,
    label: link.label ?? null,
    sortOrder,
  }));
}
