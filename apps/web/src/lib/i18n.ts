import { getTranslations as getNextIntlTranslations } from 'next-intl/server';

import { NextIntlRawTranslator, ServerTranslator } from '@/types/i18n';

export async function getTranslations(namespace?: string): ServerTranslator {
  const t = (await getNextIntlTranslations(
    namespace as any
  )) as unknown as NextIntlRawTranslator;

  return (sourceText: string): string => {
    try {
      const translated = t.raw(sourceText as any);

      if (!translated || translated === sourceText) {
        return sourceText;
      }

      return translated;
    } catch {
      return sourceText;
    }
  };
}

export function getTranslatedContent<T extends { language: string }>(translations: T[], locale: string): T {
  return (
    translations.find((t) => t.language === locale) ||
    translations.find((t) => t.language === 'en') ||
    translations[0]
  );
}
