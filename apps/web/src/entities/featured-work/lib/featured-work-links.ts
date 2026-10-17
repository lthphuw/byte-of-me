import type { FeaturedWorkFormValues } from '@byte-of-me/contracts/featured-work';

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
