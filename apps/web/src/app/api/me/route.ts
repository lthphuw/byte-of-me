import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { siteConfig } from '@/config/site';
import { getTranslations, translateDeep } from '@/lib/i18n';

export async function GET(req: NextRequest) {
  try {
    const queryParams = req.nextUrl.searchParams;
    const locale = queryParams.get('locale') || 'en';

    const email = siteConfig.email;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ...(queryParams.has('bannerImages', 'true')
          ? {
              bannerImages: true,
            }
          : {}),
        ...(queryParams.has('educations', 'true')
          ? {
              educations: {
                include: {
                  subItems: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            }
          : {}),
        ...(queryParams.has('projects', 'true')
          ? {
              projects: {
                orderBy: {
                  createdAt: 'desc',
                },
              },
            }
          : {}),
        ...(queryParams.has('techstacks', 'true')
          ? {
              techstacks: true,
            }
          : {}),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const t = await getTranslations();
    return NextResponse.json(
      { data: translateDeep(user, t) } as ApiResponse<any>,
      {
        status: 200,
      }
    );
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
