/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';



import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';
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

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const educations = await prisma.education.findMany({
      where: { userId: user.id },
      include: {
        subItems: {},
      },
    });

    const translatedEducations = educations.map((edu) => ({
      id: edu.id,
      timeline: edu.timeline,
      title: edu.title,
      message: edu.message,
      icon: edu.icon,
      subItems: edu.subItems?.map((sub) => ({
        id: sub.id,
        title: sub.title,
        message: sub.message,
      })),
    }));

    return NextResponse.json(
      { data: translatedEducations } as ApiResponse<any[]>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user educations:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
