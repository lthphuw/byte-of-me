import { NextRequest, NextResponse } from 'next/server';
import { FlagType } from '@/types';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';
import { supportedLanguages } from '@/config/language';





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
    const tags = await prisma.tag.findMany();

    const cleanTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
    }));

    return NextResponse.json(
      { data: cleanTags } as ApiResponse<typeof cleanTags>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
