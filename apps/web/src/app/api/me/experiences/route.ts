 
import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';



import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';
import { siteConfig } from '@/config/site';
import { calculateDuration, formatDate } from '@/lib/core';
import { CompanyExperience } from '@/components/experience-timeline';





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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const experiences = await prisma.experience.findMany({
      where: { userId: user.id },
      include: {
        roles: { include: { tasks: true } },
        techstacks: { include: { techstack: true } },
      },
    });

    const cleanExperiences: CompanyExperience[] = experiences.map((exp) => ({
      id: exp.id,
      company: exp.company,
      logoUrl: exp.logoUrl,
      techStack: exp.techstacks.map((ts) => ts.techstack.name),

      roles: exp.roles.map((role) => ({
        title: role.title,
        from: formatDate(role.startDate),
        to: role.endDate ? formatDate(role.endDate) : 'Present',
        duration: calculateDuration(role.startDate, role.endDate),
        location: exp.location || 'Unknown',
        type: exp.type || 'Unknown',
        tasks: role.tasks.map((task) => task.content || 'No task description'),
      })),
    }));

    return NextResponse.json(
      { data: cleanExperiences } as ApiResponse<CompanyExperience[]>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user experiences:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
