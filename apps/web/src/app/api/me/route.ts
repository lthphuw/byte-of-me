import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { siteConfig } from '@/config/site';





export async function GET(req: NextRequest) {
  try {
    const email = siteConfig.email;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        bannerImages: {},
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const translatedUser = {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      birthdate: user.birthdate,
      greeting: user.greeting,
      bio: user.bio,
      aboutMe: user.aboutMe,
      tagLine: user.tagLine,
      email: user.email,
      // phoneNumber: user.phoneNumber,
      linkedIn: user.linkedIn,
      facebook: user.facebook,
      github: user.github,
      // leetCode: user.leetCode,
      // twitter: user.twitter,
      // portfolio: user.portfolio,
      // stackOverflow: user.stackOverflow,
      // image: user.image,
      // imageCaption: user.translations.find(t => t.field === 'imageCaption')?.value || user.imageCaption,
      quote: user.quote,
      // createdAt: user.createdAt?.toISOString(),
      // updatedAt: user.updatedAt?.toISOString(),
      bannerImages: user.bannerImages?.map((img) => ({
        id: img.id,
        src: img.src,
        caption: img.caption,
      })),
    };

    return NextResponse.json({ data: translatedUser } as ApiResponse<any>, {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
