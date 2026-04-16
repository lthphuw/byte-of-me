'use server';

import { prisma } from '@byte-of-me/db';

export async function getBlogStats(blogId: string) {
  const stats = await prisma.blogStatisticLog.aggregate({
    where: { blogId },
    _count: { id: true },
    _avg: { readingTime: true },
  });

  return {
    views: stats._count.id || 0,
    avgTime: Math.round((stats._avg.readingTime || 0) / 60),
  };
}
