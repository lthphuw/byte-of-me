import { NextResponse } from 'next/server';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { siteConfig } from '@/config/site';

export async function GET() {
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

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        tags: { include: { tag: true } },
        techstacks: { include: { techstack: true } },
        coauthors: { include: { coauthor: true } },
        blogs: true,
      },
    });

    const res = projects.map((proj) => ({
      id: proj.id,
      userId: proj.userId,
      title: proj.title,
      slug: proj.slug,
      description: proj.description,
      githubLink: proj.githubLink,
      liveLink: proj.liveLink,
      startDate: proj.startDate,
      endDate: proj.endDate,
      blogs: proj.blogs,
      coauthors: proj.coauthors,
      tags: proj.tags,
      techstacks: proj.techstacks,
    }));

    return NextResponse.json({ data: res } as ApiResponse<any[]>, {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
