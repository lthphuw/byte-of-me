import { isRichTextBlank } from '@byte-of-me/ui/lib/rich-text-content';

import type { AdminFeaturedWorkDetail } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

/** The two languages the form always shows, in the order the fields appear. */
export const FEATURED_WORK_LANGUAGES = ['en', 'vi'] as const;

type Translation = FeaturedWorkFormValues['translations'][number];
type StoredTranslation = AdminFeaturedWorkDetail['translations'][number];

const blank = (language: string): Translation => ({
  language,
  title: '',
  description: '',
  details: '',
});

// `details` is always sent, even as '': the update action rewrites every
// translation, so a body the form dropped would be stored as null.
const toTranslation = (t: StoredTranslation): Translation => ({
  language: t.language,
  title: t.title,
  description: t.description ?? '',
  details: t.details ?? '',
});

/**
 * Index 0 is `en`, index 1 `vi`. Other or repeated languages follow hidden, so
 * saving never deletes them and the schema can report the repeat.
 */
export function toTranslationValues(
  stored: StoredTranslation[] = []
): Translation[] {
  const placed = new Set<StoredTranslation>();
  const fixed = FEATURED_WORK_LANGUAGES.map((language) => {
    const found = stored.find((t) => t.language === language);
    if (!found) return blank(language);
    placed.add(found);
    return toTranslation(found);
  });
  const extras = stored.filter((t) => !placed.has(t)).map(toTranslation);
  return [...fixed, ...extras];
}

/**
 * A translation with no title, description or body shows nothing, so it is
 * dropped. A body alone is not blank: it keeps the row, and the title error
 * then names the language instead of silently losing the body.
 */
const isBlank = (t: Translation) =>
  !t.title.trim() &&
  !(t.description ?? '').trim() &&
  isRichTextBlank(t.details);

/**
 * Index 0 (`en`) is always kept so a blank title is reported under the English
 * field; any other translation is kept only if it has something to show.
 */
export function keptTranslationIndexes(
  translations: readonly Translation[]
): number[] {
  if (translations.length === 0) return [];
  return translations.flatMap((t, i) => (i === 0 || !isBlank(t) ? [i] : []));
}
