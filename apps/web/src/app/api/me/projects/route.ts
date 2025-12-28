/* eslint-disable @typescript-eslint/no-explicit-any */
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
      },
    });

    const res = projects.map((proj) => ({
      id: proj.id,
      userId: proj.userId,
      title: proj.title,
      description: proj.description,
      githubLink: proj.githubLink,
      liveLink: proj.liveLink,
      startDate: proj.startDate,
      endDate: proj.endDate,
      coauthors: proj.coauthors.map((it: any) => ({
        id: it.coauthor.id,
        fullname: it.coauthor.fullname,
        email: it.coauthor.email,
      })),
      tags: proj.tags.map((ts: any) => ({
        id: ts.tag.id,
        name: ts.tag.name,
      })),
      techstacks: proj.techstacks.map((ts: any) => ({
        id: ts.techstack.id,
        name: ts.techstack.name,
      })),
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
