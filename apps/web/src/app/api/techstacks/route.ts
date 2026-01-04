import { NextResponse } from 'next/server';
import { prisma } from '@db/client';

import { ApiResponse } from '@/types/api';





export async function GET() {
  try {
    const tags = await prisma.techStack.findMany();
    return NextResponse.json({ data: tags }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user techstack:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
