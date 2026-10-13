import type { AdminTag } from './types';

import { getTranslatedContent } from '@/shared/lib/i18n-utils';

/** The name a tag is shown under: its translation for `locale`, else its slug. */
export function tagDisplayName(tag: AdminTag, locale: string): string {
  return getTranslatedContent(tag.translations, locale)?.name || tag.slug;
}
