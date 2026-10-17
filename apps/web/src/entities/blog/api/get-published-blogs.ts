import { prisma } from '@byte-of-me/db';

/**
 * Every published post with its last-edited time. A plain server module, not a `'use server'`
 * action: callers (`sitemap.ts`, `generateStaticParams`) run at build time, where `getLocale()` is
 * unavailable, and a failure should fail the build rather than become an empty sitemap.
 */
export async function getPublishedBlogs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.blog.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });
}
