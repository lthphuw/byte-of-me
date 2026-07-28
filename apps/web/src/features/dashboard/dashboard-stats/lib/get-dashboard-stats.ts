'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export type DashboardStats = {
  totalMessages: number;
  totalProjects: number;
  totalBlogs: number;
  totalEducation: number;
  totalCompanies: number;
  totalTechStack: number;
  totalTags: number;
  newMessages: number;
};

export async function getDashboardStats(): Promise<
  | { success: true; data: DashboardStats }
  | { success: false; data: null; errorMsg: string }
> {
  try {
    const session = await requireAdmin();
    const userId = session.id;

    const [
      messageCount,
      projectCount,
      blogCount,
      educationCount,
      companyCount,
      techStackCount,
      tagCount,
    ] = await Promise.all([
      prisma.contactMessage.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.blog.count({ where: { userId } }),
      prisma.education.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.techStack.count({ where: {} }),
      prisma.tag.count({ where: {} }),
    ]);

    const recentMessages = await prisma.contactMessage.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      success: true,
      data: {
        totalMessages: messageCount,
        totalProjects: projectCount,
        totalBlogs: blogCount,
        totalEducation: educationCount,
        totalCompanies: companyCount,
        totalTechStack: techStackCount,
        totalTags: tagCount,
        newMessages: recentMessages,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch dashboard stats');
    logger.error(`Get Dashboard stats  Error: ${errorMsg}`);
    return { success: false, data: null, errorMsg };
  }
}
