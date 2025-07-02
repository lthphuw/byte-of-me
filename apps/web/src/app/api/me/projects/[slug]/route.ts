import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';
import { dbCachingConfig, revalidateTime } from '@/config/revalidate';

// https://nextjs.org/docs/app/api-reference/file-conventions/route#dynamic-route-segments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') || 'en';

  if (!supportedLanguages.includes(locale as FlagType)) {
    return NextResponse.json(
      { error: 'Invalid or unsupported locale' } as ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const project = await unstable_cache(
      async () =>
        await prisma.project.findUnique({
          cacheStrategy: dbCachingConfig,
          where: { id: slug },
          include: {
            tags: { include: { tag: true } },
            techstacks: { include: { techstack: true } },
            translations: { where: { language: locale } },
          },
        }),
      ['project', slug, locale],
      {
        revalidate: revalidateTime,
        tags: ['project', `project-${slug}`, `project-${slug}-${locale}`],
      }
    )();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const translations = project.translations?.reduce(
      (acc, t) => ({ ...acc, [t.field]: t.value }),
      {} as Record<string, string>
    );

    const result = {
      id: project.id,
      userId: project.userId,
      title: translations['title'] || project.title,
      description: translations['description'] || project.description,
      githubLink: project.githubLink,
      liveLink: project.liveLink,
      startDate: project.startDate,
      endDate: project.endDate,
      tags: project.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
      })),
      techstacks: project.techstacks.map((t) => ({
        id: t.techstack.id,
        name: t.techstack.name,
      })),
    };

    return NextResponse.json({ data: result } as ApiResponse<typeof result>, {
      status: 200,
    });
  } catch (err) {
    console.error('Error fetching project:', err);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
