import { Translation } from '@repo/db/generated/prisma/client';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { env } from '@/env.mjs';

import { routing } from './routing';


export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Load static & dynamic song song
  const [staticResult, dynamicResult] = await Promise.all([
    // Static
    (async () => {
      try {
        const mod = await import(`../../messages/${locale}.json`);
        return mod.default ?? {};
      } catch (_) {
        return {};
      }
    })(),

    // Dynamic
    (async () => {
      try {
        const res = await fetch(`${env.HOST}/api/translations?lang=${locale}`, {
          cache: 'no-store',
        });

        if (!res.ok) return {};

        const data: Translation[] = await res.json();
        return data.reduce((acc, item) => {
          acc[item.sourceText] = item.translated;
          return acc;
        }, {} as Record<string, string>);
      } catch (_) {
        return {};
      }
    })(),
  ]);

  const messages = {
    ...staticResult,
    ...dynamicResult,
  };

  return {
    locale,
    messages,
  };
});
