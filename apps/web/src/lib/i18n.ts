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

export function translateDeep(
  value: any,
  t: (key: string) => string
): any {
  if (Array.isArray(value)) {
    return value.map((v) => translateDeep(v, t));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        translateDeep(v, t),
      ])
    );
  }

  if (typeof value === 'string') {
    try {
      return t(value);
    } catch {
      return value;
    }
  }

  return value;
}
