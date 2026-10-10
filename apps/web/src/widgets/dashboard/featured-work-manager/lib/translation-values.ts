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
 * Index 0 is always `en` and index 1 always `vi`, so the form can address them
 * by position. A stored translation in any other language, or a repeat of one
 * already placed, follows hidden: saving must not silently delete it, and a
 * repeat is what the schema's "each language once" check exists to report.
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
 * Positions to submit: every translation with a title or a description, so an
 * untouched `vi` stays optional. At least the first one is always kept, so an
 * empty form still reports "Title is required" instead of an empty list.
 */
export function keptTranslationIndexes(
  translations: readonly Translation[]
): number[] {
  if (translations.length === 0) return [];
  const kept = translations.flatMap((t, i) => (isBlank(t) ? [] : [i]));
  return kept.length > 0 ? kept : [0];
}
