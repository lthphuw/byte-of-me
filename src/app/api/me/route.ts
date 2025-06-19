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
            include: {
                translations: { where: { language: locale } },
                bannerImages: {
                    include: {
                        translations: { where: { language: locale } }
                    }
                }
            },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const translatedUser = {
            id: user.id,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            birthdate: user.birthdate,
            greeting: user.translations.find(t => t.field === 'greeting')?.value || user.greeting,
            bio: user.translations.find(t => t.field === 'bio')?.value || user.bio,
            aboutMe: user.translations.find(t => t.field === 'aboutMe')?.value || user.aboutMe,
            tagLine: user.translations.find(t => t.field === 'tagLine')?.value || user.tagLine,
            email: user.email,
            phoneNumber: user.phoneNumber,
            linkedIn: user.linkedIn,
            facebook: user.facebook,
            github: user.github,
            leetCode: user.leetCode,
            twitter: user.twitter,
            portfolio: user.portfolio,
            stackOverflow: user.stackOverflow,
            image: user.image,
            imageCaption: user.translations.find(t => t.field === 'imageCaption')?.value || user.imageCaption,
            quote: user.translations.find(t => t.field === 'quote')?.value || user.quote,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            bannerImages: user.bannerImages.map((img, i) => ({
                ...img,
                caption: img.translations.find(t => t.field === "caption")?.value || img.caption
            }))
        };

        return new Response(JSON.stringify(translatedUser), {
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