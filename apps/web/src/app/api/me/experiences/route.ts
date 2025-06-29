// app/api/experiences/route.ts

import { FlagType } from '@/types';
import { prisma } from '@db/client';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CompanyExperience } from '@/components/experience-timeline';
import { supportedLanguages } from '@/config/language';
import { calculateDuration, formatDate } from '@/lib/utils';
import { ApiResponse } from '@/types/api';

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
    const email = 'lthphuw@gmail.com';

    const user = await unstable_cache(
      async () =>
        await prisma.user.findUnique({
          where: { email },
        }),
      ['simple-me', locale],
      { revalidate: 86400, tags: ['simple-me', `simple-me-${locale}`] }
    )();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const experiences = await unstable_cache(
      async () =>
        await prisma.experience.findMany({
          where: { userId: user.id },
          include: {
            roles: { include: { tasks: true } },
            techstacks: { include: { techstack: true } },
            translations: { where: { language: locale } },
          },
        }),
      ['experiences', locale],
      { revalidate: 86400, tags: ['experiences', `experiences-${locale}`] }
    )();

    const translatedExperiences: CompanyExperience[] = experiences.map(
      (exp) => {
        const translations = exp.translations.reduce(
          (acc, t) => ({ ...acc, [t.field]: t.value }),
          {} as Record<string, string>
        );

        return {
          company: translations.company || exp.company,
          logoUrl: exp.logoUrl,
          techStack: exp.techstacks.map((ts) => ts.techstack.name),
          roles: exp.roles.map((role) => ({
            title: translations[`role_title_${role.title}`] || role.title,
            from: formatDate(role?.startDate),
            to: role.endDate ? formatDate(role?.endDate) : 'Present',
            duration: calculateDuration(role.startDate, role.endDate),
            location: exp.location || 'Unknown',
            type: exp.type || 'Unknown',
            tasks: role.tasks.map(
              (task, idx) =>
                translations[`task_${role.title}_${idx}`] ||
                task.content ||
                'No task description'
            ),
          })),
        };
      }
    );

    return NextResponse.json(
      { data: translatedExperiences } as ApiResponse<CompanyExperience[]>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user experiences:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
