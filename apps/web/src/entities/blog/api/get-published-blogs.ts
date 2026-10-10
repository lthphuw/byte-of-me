import { prisma } from '@byte-of-me/db';

/**
 * Every published post, with the time it was last edited.
 *
 * Deliberately a plain server module instead of a `'use server'` action with an
 * `ApiResponse` envelope: the callers (`sitemap.ts`, `generateStaticParams`) run
 * at build time, outside a request, so `withPublicActionHandler` — which resolves
 * the locale through `getLocale()` — cannot be used here. The result is
 * locale-independent, and a failure should fail the build loudly rather than be
 * swallowed into `{ success: false }` and silently produce an empty sitemap.
 */
export async function getPublishedBlogs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.blog.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });
}
