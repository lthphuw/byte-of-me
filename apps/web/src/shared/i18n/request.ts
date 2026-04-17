import { prisma } from '@byte-of-me/db';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

import { deepMerge } from '@/shared/lib/deep-merge';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const [staticMessages, dynamicMessages] = await Promise.all([
    // Static JSON
    (async () => {
      try {
        const mod = await import(`../../../messages/${locale}.json`);
        return mod.default ?? {};
      } catch (err) {
        console.error('[i18n] Static load error:', err);
        return {};
      }
    })(),

    (async () => {
      try {
        const data = await prisma.translation.findMany({});
        return data.reduce((acc, item) => {
          acc[item.sourceText] = item.translated;
          return acc;
        }, {} as Record<string, string>);
      } catch (err) {
        console.error('[i18n] Dynamic load error:', err);
        return {};
      }
    })(),
  ]);

  const messages = deepMerge({}, staticMessages, dynamicMessages);

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

function setDeep(obj: Record<string, Any>, path: string, value: string) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (i === keys.length - 1) {
      current[key] = value;
    } else {
      current[key] = current[key] ?? {};
      current = current[key];
    }
  }
}
