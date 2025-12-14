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

    return NextResponse.json({ data: {
      email: user.email || '',
        linkedIn: user.linkedIn || '',
        github: user.github || '',
      } } as ApiResponse<any>, {
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  } finally {
    // await prisma.$disconnect();
  }
}
