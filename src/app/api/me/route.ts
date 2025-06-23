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

        const user = await unstable_cache(
            async () => {
                return await prisma.user.findUnique({
                    where: { email },
                    include: {
                        translations: { where: { language: locale } },
                        bannerImages: {
                            include: {
                                translations: { where: { language: locale } },
                            },
                        },
                    },
                });
            },
            ['me'],
            { revalidate: 86400, tags: ['me'] }
        )()

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' } as ApiResponse<never>,
                { status: 404 }
            );
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
            // phoneNumber: user.phoneNumber,
            // linkedIn: user.linkedIn,
            // facebook: user.facebook,
            // github: user.github,
            // leetCode: user.leetCode,
            // twitter: user.twitter,
            // portfolio: user.portfolio,
            // stackOverflow: user.stackOverflow,
            // image: user.image,
            // imageCaption: user.translations.find(t => t.field === 'imageCaption')?.value || user.imageCaption,
            quote: user.translations.find(t => t.field === 'quote')?.value || user.quote,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            bannerImages: user.bannerImages.map(img => ({
                id: img.id,
                src: img.src,
                caption: img.translations.find(t => t.field === 'caption')?.value || img.caption,
            })),
        };

        return NextResponse.json(
            { data: translatedUser } as ApiResponse<any>,
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Internal server error' } as ApiResponse<never>,
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}