/**
 * Languages a locale-scoped read fetches: the locale plus the 'en' fallback
 * `getTranslatedContent` resolves to. Use as `where: { language: { in:
 * getTranslationLanguages(locale) } }` so no unrenderable rows are pulled.
 */
export function getTranslationLanguages(locale: string): string[] {
  return [...new Set([locale, 'en'])];
}

export function getTranslatedContent<T extends { language: string }>(
  translations: T[],
  locale: string
): T | undefined {
  return (
    translations.find((t) => t.language === locale) ||
    translations.find((t) => t.language === 'en') ||
    translations[0]
  );
}
