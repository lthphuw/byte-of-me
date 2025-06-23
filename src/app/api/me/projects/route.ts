// app/api/experiences/route.ts
import { supportedLanguages } from '@/config/language';
import { PrismaClient, Project } from '@/generated/prisma/client';
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
            { status: 400 },
        );
    }

    try {
        const email = 'lthphuw@gmail.com';

        const user = await unstable_cache(
            async () =>
                await prisma.user.findUnique({
                    where: { email },
                }),
            ['user-simple'],
            { revalidate: 86400, tags: ['user-simple'] },
        )();

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' } as ApiResponse<never>,
                { status: 404 },
            );
        }

        const projects = await unstable_cache(
            async () =>
                await prisma.project.findMany({
                    where: { userId: user.id },
                    include: {
                        tags: { include: { tag: true } },
                        techstacks: { include: { techstack: true } },
                        translations: { where: { language: locale } },
                    },
                }),
            ['experiences'],
            { revalidate: 86400, tags: ['experiences'] },
        )();

        const translatedProjects: any[] = projects.map((proj) => {
            const translations = proj.translations?.reduce(
                (acc, t) => ({ ...acc, [t.field]: t.value }),
                {} as Record<string, string>,
            );

            return {
                id: proj.id,
                userId: proj.userId,
                title: translations['title'] || proj.title,
                description: translations['description'] || proj.description,
                githubLink: proj.githubLink,
                liveLink: proj.liveLink,
                startDate: proj.startDate,
                endDate: proj.endDate,
                tags: proj.tags.map((ts) => ({
                    id: ts.tag.id,
                    name: ts.tag.name,
                })),
                techstacks: proj.techstacks.map((ts) => ({
                    id: ts.techstack.id,
                    name: ts.techstack.name,
                })),
            };
        });

        return NextResponse.json(
            { data: translatedProjects } as ApiResponse<Project[]>,
            { status: 200 },
        );
    } catch (error) {
        console.error('Error fetching user experiences:', error);
        return NextResponse.json(
            { error: 'Internal server error' } as ApiResponse<never>,
            { status: 500 },
        );
    } finally {
        await prisma.$disconnect();
    }
}
