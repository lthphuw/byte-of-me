// app/api/me/[locale]/route.js
import { supportedLanguages } from '@/config/language';
import { PrismaClient } from '@/generated/prisma/client';
import { FlagType } from '@/types';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const locale = searchParams.get("locale") || "en";

    if (!supportedLanguages.includes(locale as FlagType)) {
        return new Response(JSON.stringify({ error: 'Invalid or unsupported locale' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    try {
        const email = 'lthphuw@gmail.com';

        const user = await prisma.user.findUnique({
            where: { email },
        });

        const educations = await prisma.education.findMany({
            where: { userId: user?.id },
            include: {
                translations: { where: { language: locale } },
                subItems: { include: { translations: { where: { language: locale } } } },
            },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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
        }))

        return new Response(JSON.stringify(translatedEducations), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    } finally {
        await prisma.$disconnect();
    }
}