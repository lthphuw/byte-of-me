import { Suspense } from 'react';
import { Calendar, FolderCode, Tag as TagIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { PublicBlog } from '@/entities/blog';
import {
  BlogAnalytics,
  BlogLiveStats,
  BlogLiveStatsSkeleton,
} from '@/features/public';
import { formatDate } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { RichText } from '@/shared/ui/rich-text';
import { Separator } from '@/shared/ui/separator';
import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';

export async function BlogDetailsContent({ blog }: { blog: PublicBlog }) {
  const t = await getTranslations('blogDetails');

  return (
    <>
      <BlogDetailsShell>
        <div className="flex w-full min-w-0 flex-col items-center overflow-hidden py-8 md:px-8 md:py-12">
          <div className="w-full min-w-0 max-w-3xl">
            <h1 className="break-words text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {blog.title}
            </h1>

            {blog.description && (
              <p className="mt-3 break-words text-lg text-muted-foreground">
                {blog.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-6 text-sm">
              {blog.publishedDate && (
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="whitespace-nowrap">
                    {formatDate(blog.publishedDate)}
                  </span>
                </div>
              )}

              <Separator
                orientation="vertical"
                className="hidden h-4 md:block"
              />

              <Suspense fallback={<BlogLiveStatsSkeleton />}>
                <BlogLiveStats blogId={blog.id} />
              </Suspense>
            </div>

            {/* COVER */}
            {blog.coverImage && (
              <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                <Image
                  src={blog.coverImage.url}
                  alt={blog.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            )}

            {/* TAGS */}
            <div className="mt-6 flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    <TagIcon className="mr-1.5 h-3 w-3 shrink-0" />
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>

            {/* CONTENT */}
            <article className="w-full min-w-0 max-w-[calc(100vw-4rem)] overflow-hidden break-words md:max-w-none">
              {' '}
              <RichText content={blog.content} />
            </article>

            {/* PROJECT CARD */}
            {blog.project && (
              <>
                <Separator className="my-10" />
                <div className="pb-10">
                  <p className="mb-3 text-sm font-semibold text-muted-foreground">
                    {t('relatedProject')}
                  </p>
                  <Card className="group overflow-hidden p-4 transition hover:border-primary/50">
                    <Link
                      href={blog.project.githubLink!}
                      target="_blank"
                      className="block min-w-0"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <FolderCode className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm font-semibold">
                          {blog.project.title}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 break-words text-xs italic text-muted-foreground">
                        {blog.project.description}
                      </p>
                    </Link>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </BlogDetailsShell>

      <BlogAnalytics blogId={blog.id} />
    </>
  );
}
