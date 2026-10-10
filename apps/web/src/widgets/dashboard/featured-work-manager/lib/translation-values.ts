import type { AdminFeaturedWork } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

/** The two languages the form always shows, in the order the fields appear. */
export const FEATURED_WORK_LANGUAGES = ['en', 'vi'] as const;

type Translation = FeaturedWorkFormValues['translations'][number];

const blank = (language: string): Translation => ({
  language,
  title: '',
  description: '',
});

/**
 * Index 0 is `en`, index 1 `vi`. Other or repeated languages follow hidden, so
 * saving never deletes them and the schema can report the repeat.
 */
export function toTranslationValues(
  stored: AdminFeaturedWork['translations'] = []
): Translation[] {
  const placed = new Set<AdminFeaturedWork['translations'][number]>();
  const fixed = FEATURED_WORK_LANGUAGES.map((language) => {
    const found = stored.find((t) => t.language === language);
    if (!found) return blank(language);
    placed.add(found);
    return {
      language,
      title: found.title,
      description: found.description ?? '',
    };
  });
  const extras = stored
    .filter((t) => !placed.has(t))
    .map((t) => ({
      language: t.language,
      title: t.title,
      description: t.description ?? '',
    }));
  return [...fixed, ...extras];
}

const isBlank = (t: Translation) =>
  !t.title.trim() && !(t.description ?? '').trim();

/**
 * Index 0 (`en`) is always kept so a blank title is reported under the English
 * field; any other translation is kept only if it has a title or description.
 */
export function keptTranslationIndexes(
  translations: readonly Translation[]
): number[] {
  if (translations.length === 0) return [];
  return translations.flatMap((t, i) => (i === 0 || !isBlank(t) ? [i] : []));
}
