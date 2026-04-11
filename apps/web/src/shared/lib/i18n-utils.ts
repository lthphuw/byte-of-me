export function getTranslatedContent<T extends { language: string }>(
  translations: T[],
  locale: string
): T {
  return (
    translations.find((t) => t.language === locale) ||
    translations.find((t) => t.language === 'en') ||
    translations[0]
  );
}
