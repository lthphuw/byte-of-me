import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { siteConfig } from '@/config/site';
import { CompanyExperience } from '@/components/experience-timeline';





export async function GET(req: NextRequest) {
  try {
    const queryParams = req.nextUrl.searchParams;
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

    return NextResponse.json(
      { data: experiences } as ApiResponse<CompanyExperience[]>,
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
