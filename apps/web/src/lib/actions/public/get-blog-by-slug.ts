import { Blog } from '@/models/blog';
import { Project } from '@/models/project';

import { ApiActionResponse } from '@/types/api/api-action.type';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/lib/actions/public/public-action-template';
import { getTranslatedContent } from '@/lib/i18n';

export async function getBlogBySlug(
  slug: string
): Promise<ApiActionResponse<Blog>> {
  if (!slug) {
    return { success: false, errorMsg: 'Slug is required' };
  }

  return handlePublicAction('getBlogBySlug', async () => {
    return await withPublicActionHandler(
      'getBlogBySlug',
      async ({ locale, prisma }) => {
        const blog = await prisma.blog.findUniqueOrThrow({
          where: { slug, isPublished: true },
          include: {
            translations: true,
            coverImage: true,
            tags: { include: { tag: { include: { translations: true } } } },
            project: { include: { translations: true } },
          },
        });

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
      },
      {
        cache: true,
        cacheKey: ['blog'],
        cacheTags: ['blog', slug],
      }
    );
  });
}
