import { NextResponse } from 'next/server';
import { prisma } from '@db/client';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');

  if (!lang) {
    return NextResponse.json(
      { error: 'Missing language parameter' },
      { status: 400 }
    );
  }

  try {
    const translations = await prisma.translation.findMany({
      where: { language: lang },
    });
    return NextResponse.json(translations);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch translations' },
      { status: 500 }
    );
  }
}
