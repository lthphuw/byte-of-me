import type { AdminFeaturedWorkLink } from '@/entities/featured-work/model/types';

/** The form's rows for a stored list, in position order. A blank label is an empty input. */
export function toLinkValues(links: AdminFeaturedWorkLink[] = []) {
  return links.map(({ url, label }) => ({ url, label: label ?? '' }));
}
