'use server'

import { getCurrentUser } from '@/lib/session';
import { prisma } from '@db/client';
import { revalidatePath } from 'next/cache';

export async function addBanner(data: { src: string; caption: string }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const created = await prisma.userBannerImage.create({
      data: {
        userId: user.id,
        src: data.src,
        caption: data.caption,
      },
    });

    revalidatePath('/dashboard/banner');
    return created;

}

export async function updateBanner(data: { id: string; src: string; caption: string }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const updated = await prisma.userBannerImage.update({
      where: { id: data.id },
      data: { src: data.src, caption: data.caption },
    });

    revalidatePath('/dashboard/banner');
    return updated;
}

export async function deleteBanner(id: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.userBannerImage.delete({
      where: { id },
    });

    revalidatePath('/dashboard/banner');
    return { success: true };

}
