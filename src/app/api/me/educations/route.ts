import { supportedLanguages } from '@/config/language';
import { PrismaClient } from '@/generated/prisma/client';
import { FlagType } from '@/types';
import { ApiResponse } from '@/types/api';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();


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
        const email = 'lthphuw@gmail.com';

        const user = await unstable_cache(async () => await prisma.user.findUnique({
            where: { email },
        }),
            ["me-simple"],
            { revalidate: 86400, tags: ["me-simple"] }
        )();
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' } as ApiResponse<never>,
                { status: 404 }
            );
        }

        const educations = await unstable_cache(async () => await prisma.education.findMany({
            where: { userId: user.id },
            include: {
                translations: { where: { language: locale } },
                subItems: { include: { translations: { where: { language: locale } } } },
            },
        }),
            ["educations"],
            { revalidate: 86400, tags: ["educations"] }
        )();


        const translatedEducations = educations.map((edu) => ({
            id: edu.id,
            timeline: edu.timeline,
            title: edu.translations.find(t => t.field === 'title')?.value || edu.title,
            message: edu.translations.find(t => t.field === 'message')?.value || edu.message,
            icon: edu.icon,
            subItems: edu.subItems.map(sub => ({
                id: sub.id,
                title: sub.translations.find(t => t.field === 'title')?.value || sub.title,
                message: sub.translations.find(t => t.field === 'message')?.value || sub.message,
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
        await prisma.$disconnect();
    }
}