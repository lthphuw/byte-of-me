import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';
import { dbCachingConfig, revalidateTime } from '@/config/revalidate';
import { siteConfig } from '@/config/site';





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
    const email = siteConfig.email;

    const user = await unstable_cache(
      async () =>
        await prisma.user.findUnique({
          cacheStrategy: dbCachingConfig,
          where: { email },
        }),
      ['me-simple'],
      { revalidate: revalidateTime, tags: ['me-simple'] }
    )();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const techstacks = await unstable_cache(
      async () =>
        await prisma.techStack.findMany({
          cacheStrategy: dbCachingConfig,
          where: { userId: user.id },
          include: {
            translations: { where: { language: locale } },
          },
        }),
      ['techstacks'],
      { revalidate: revalidateTime, tags: ['techstacks'] }
    )();

    return NextResponse.json(
      { data: techstacks } as ApiResponse<typeof techstacks>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user tech stacks:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
