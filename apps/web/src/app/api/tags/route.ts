import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';
import { Project } from '@db/index';

import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';
import { dbCachingConfig, revalidateTime } from '@/config/revalidate';





export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') || 'en';

  if (!supportedLanguages.includes(locale as FlagType)) {
    return NextResponse.json(
      { error: 'Invalid or unsupported locale' } as ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const tags = await unstable_cache(
      async () =>
        await prisma.tag.findMany({
          cacheStrategy: dbCachingConfig,
          include: {
            translations: { where: { language: locale } },
          },
        }),
      ['tags', locale],
      { revalidate: revalidateTime, tags: ['tags', `tags-${locale}`] }
    )();

    const translatedTags: any[] = tags.map((tag) => {
      const translations = tag.translations?.reduce(
        (acc, t) => ({ ...acc, [t.field]: t.value }),
        {} as Record<string, string>
      );

      return {
        id: tag.id,
        name: translations['name'] || tag.name,
      };
    });

    return NextResponse.json(
      { data: translatedTags } as ApiResponse<Project[]>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
