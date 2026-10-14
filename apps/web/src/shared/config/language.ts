import type { LocaleType } from '@/shared/types';

/** The message key under `global.i18nToggle` that names each language. */
export const languageNames = {
  en: 'english',
  vi: 'vietnamese',
} as const satisfies Record<LocaleType, string>;
