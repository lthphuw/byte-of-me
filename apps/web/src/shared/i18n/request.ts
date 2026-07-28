import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // UI strings come exclusively from the static JSON catalogues. Dynamic
  // content translation lives in the per-entity *Translation tables and is
  // resolved by getTranslatedContent — never merged into next-intl.
  let messages: Record<string, unknown> = {};
  try {
    const mod = await import(`../../../messages/${locale}.json`);
    messages = mod.default ?? {};
  } catch (err) {
    console.error('[i18n] Static load error:', err);
  }

  return {
    locale,
    messages,

    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },

        medium: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },

        long: {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        },

        precise: {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        },
      },

      number: {
        precise: {
          maximumFractionDigits: 5,
        },
      },

      list: {
        enumeration: {
          style: 'long',
          type: 'conjunction',
        },
      },
    },
  };
});
