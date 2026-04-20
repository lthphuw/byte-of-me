'use server';

import { prisma } from '@byte-of-me/db';

import { requireAdmin } from '@/shared/lib/auth';





export async function getDashboardStats() {
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
      translationCount,
    ] = await Promise.all([
      prisma.contactMessage.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
      prisma.blog.count({ where: { userId } }),
      prisma.education.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.techStack.count({ where: {} }),
      prisma.tag.count({ where: {} }),
      prisma.translation.count({ where: {} }),
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
        totalTranslations: translationCount,
        newMessages: recentMessages,
      },
    };
  } catch (error: Any) {
    console.error(`Get Dashboard stats  Error: ${error.message}`);
    return { success: false, data: null };
  }
}
