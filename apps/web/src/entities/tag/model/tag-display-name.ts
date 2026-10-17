import { getTranslatedContent } from '@byte-of-me/api-core';

import type { AdminTag } from './types';

/** The name a tag is shown under: its translation for `locale`, else its slug. */
export function tagDisplayName(tag: AdminTag, locale: string): string {
  return getTranslatedContent(tag.translations, locale)?.name || tag.slug;
}
