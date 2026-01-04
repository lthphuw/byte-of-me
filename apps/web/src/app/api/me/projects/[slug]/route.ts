import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';

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
    const project = await prisma.project.findUnique({
      where: { slug: slug },
      include: {
        blogs: true,
        tags: { include: { tag: true } },
        techstacks: { include: { techstack: true } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const result = {
      id: project.id,
      userId: project.userId,
      title: project.title,
      description: project.description,
      githubLink: project.githubLink,
      liveLink: project.liveLink,
      startDate: project.startDate,
      endDate: project.endDate,
      blogs: project.blogs,
      tags: project.tags,
      techstacks: project.techstacks,
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
