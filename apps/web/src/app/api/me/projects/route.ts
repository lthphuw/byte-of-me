/* eslint-disable @typescript-eslint/no-explicit-any */
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';
import { Project } from '@db/index';



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
      ['user-simple', locale],
      {
        revalidate: revalidateTime,
        tags: ['user-simple', `user-simple-${locale}`],
      }
    )();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const projects = await unstable_cache(
      async () =>
        await prisma.project.findMany({
          cacheStrategy: dbCachingConfig,
          where: { userId: user.id },
          include: {
            tags: { include: { tag: true } },
            techstacks: { include: { techstack: true } },
            coauthors: { include: { coauthor: true } },
            translations: { where: { language: locale } },
          },
        }),
      ['projects', locale],
      { revalidate: revalidateTime, tags: ['projects', `projects-${locale}`] }
    )();

    const translatedProjects: any[] = projects.map((proj) => {
      const translations = proj.translations?.reduce(
        (acc, t) => ({ ...acc, [t.field]: t.value }),
        {} as Record<string, string>
      );

      return {
        id: proj.id,
        userId: proj.userId,
        title: translations['title'] || proj.title,
        description: translations['description'] || proj.description,
        githubLink: proj.githubLink,
        liveLink: proj.liveLink,
        startDate: proj.startDate,
        endDate: proj.endDate,
        coauthors: proj.coauthors.map((it) => ({
          id: it.coauthor.id,
          fullname: it.coauthor.fullname,
          email: it.coauthor.email,
        })),
        tags: proj.tags.map((ts) => ({
          id: ts.tag.id,
          name: ts.tag.name,
        })),
        techstacks: proj.techstacks.map((ts) => ({
          id: ts.techstack.id,
          name: ts.techstack.name,
        })),
      };
    });

    return NextResponse.json(
      { data: translatedProjects } as ApiResponse<Project[]>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
