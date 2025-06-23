// app/api/experiences/route.ts
import { CompanyExperience } from '@/components/experience-timeline';
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

        const experiences = await unstable_cache(
            async () =>
                await prisma.experience.findMany({
                    where: { userId: user.id },
                    include: {
                        roles: { include: { tasks: true } },
                        techstacks: { include: { techstack: true } },
                        translations: { where: { language: locale } },
                    },
                }),
            ['experiences'],
            { revalidate: 86400, tags: ['experiences'] },
        )();

        const translatedExperiences: CompanyExperience[] = experiences.map((exp) => {
            const translations = exp.translations.reduce(
                (acc, t) => ({ ...acc, [t.field]: t.value }),
                {} as Record<string, string>,
            );

            return {
                company: translations.company || exp.company,
                logoUrl: exp.logoUrl,
                techStack: exp.techstacks.map((ts) => ts.techstack.name),
                roles: exp.roles.map((role) => ({
                    title: translations[`role_title_${role.title}`] || role.title,
                    from: role.startDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    to: role.endDate
                        ? role.endDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'Present',
                    duration: calculateDuration(role.startDate, role.endDate),
                    location: exp.location,
                    type: exp.type,
                    tasks: role.tasks.map((task, idx) => translations[`task_${role.title}_${idx}`] || task.content),
                })),
            };
        });

        return NextResponse.json(
            { data: translatedExperiences } as ApiResponse<CompanyExperience[]>,
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

function calculateDuration(startDate: Date, endDate: Date | null): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth() + (years * 12);
    if (months >= 12) {
        return `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
}