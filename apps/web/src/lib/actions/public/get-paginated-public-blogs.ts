'use server';

import { Blog } from '@/models/blog';
import { Project } from '@/models/project';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { getTranslatedContent } from '@/lib/i18n';

import {
  handlePublicAction,
  withPublicActionHandler,
} from './public-action-template';

export type GetPublicProjectsParams = {
  page?: number;
  limit?: number;
  tagSlugs?: string[];
  search?: string;
};

export async function getPaginatedPublicBlogs(
  params: GetPublicProjectsParams
): Promise<ApiActionResponse<PaginatedData<Blog>>> {
  return handlePublicAction('getPaginatedPublicBlogs', async () => {
    const data = await withPublicActionHandler(
      'getPaginatedPublicBlogs',
      async ({ locale, prisma }) => {
        const { page = 1, limit = 9, tagSlugs = [], search } = params;

        const skip = (page - 1) * limit;

        const where: any = {
          isPublished: true,
        };

        // FILTER BY TAGS
        if (tagSlugs.length > 0) {
          where.tags = {
            some: {
              tag: {
                slug: {
                  in: tagSlugs,
                },
              },
            },
          };
        }

        // SEARCH
        if (search) {
          where.translations = {
            some: {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          };
        }

        const [blogsRes, total] = await Promise.all([
          prisma.blog.findMany({
            where,
            orderBy: { publishedDate: 'desc' },
            skip,
            take: limit,
            include: {
              translations: true,
              coverImage: true,
              project: {
                include: {
                  translations: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    include: {
                      translations: true,
                    },
                  },
                },
              },
            },
          }),

          prisma.blog.count({ where }),
        ]);

        const blogs: Blog[] = blogsRes.map((blog) => {
          const translated = getTranslatedContent(blog.translations, locale);
          let project: Maybe<Project> = null;

          if (blog.project) {
            const blogTranslated = getTranslatedContent(
              blog.project.translations,
              locale
            );
            project = {
              id: blog.project.id,
              slug: blog.project.slug,
              githubLink: blog.project.githubLink,
              liveLink: blog.project.liveLink,
              startDate: blog.project.startDate,
              endDate: blog.project.endDate,
              isPublished: blog.project.isPublished,

              title: blogTranslated?.title || '',
              description: blogTranslated?.description || '',

              techStacks: [],
              tags: [],
            };
          }
          return {
            id: blog.id,
            slug: blog.slug,

            isPublished: blog.isPublished,
            publishedDate: blog.publishedDate,

            title: translated?.title || '',
            description: translated?.description || '',
            content: translated?.content || '',

            project: project,
            coverImage: blog.coverImage,

            readingTime: blog.readingTime,

            tags: blog.tags.map(({ tag }) => {
              const t = getTranslatedContent(tag.translations, locale);

              return {
                id: tag.id,
                slug: tag.slug,
                name: t?.name || '',
              };
            }),
          };
        });

        return {
          data: blogs,
          meta: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasMore: page < Math.ceil(total / limit),
          },
        };
      },
      {
        cache: false,
      }
    );
    return data;
  });
}
