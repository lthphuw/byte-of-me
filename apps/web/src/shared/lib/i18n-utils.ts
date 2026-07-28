/**
 * Languages a locale-scoped read needs to fetch: the requested locale plus the
 * 'en' fallback that getTranslatedContent resolves to. Deduped for locale 'en'.
 * Use it as `where: { language: { in: getTranslationLanguages(locale) } }` so
 * translation queries never pull rows no caller can render.
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
