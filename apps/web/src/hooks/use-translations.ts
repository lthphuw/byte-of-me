'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

import { NextIntlRawTranslator, TranslatorFunc } from '@/types/i18n';

export function useTranslations(namespace?: string): TranslatorFunc {
  const t = useNextIntlTranslations(
    namespace as any
  ) as unknown as NextIntlRawTranslator;

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
