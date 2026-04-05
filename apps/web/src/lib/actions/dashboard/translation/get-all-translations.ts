import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { Translation } from '@/models/translation';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';





const fetchTranslations = async (
  locale: string
): Promise<ApiActionResponse<Translation[]>> => {

  try {
    const translations = await prisma.translation.findMany({
      where: {
        language: locale,
      },
    });

    logger.info(
      `Fetched ${translations.length} translations for locale: ${locale}`
    );

    return {
      success: true,
      data: translations.map((it) => ({
        id: it.id,
        locale: it.language,
        sourceText: it.sourceText,
        translated: it.translated,
      })),
    };
  } catch (error: any) {
    logger.error(`Error fetching translations: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to fetch translations',
    };
  }
};

export const getAllTranslations = (locale: string) =>
  unstable_cache(
    async () => fetchTranslations(locale),
    ['translation', locale],
    {
      tags: ['translation', locale],
      revalidate: 60 * 60 * 24,
    }
  )();
