import { Suspense } from 'react';
import { Separator, Skeleton } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { BlogContent } from './blog-content';

import type { PublicBlog } from '@/entities/blog';
import {
  BlogAdjacentNav,
  BlogAnalytics,
  BlogAuthorCard,
  BlogCommentSection,
  BlogRelatedPosts,
  BlogRelatedProjectCard,
  RelatedProjectCardSkeleton,
} from '@/features/public';
import { BlogActionBar } from '@/widgets/public/blog-details-content/ui/blog-action-bar';
import { BlogBreadcrumb } from '@/widgets/public/blog-details-content/ui/blog-breadcrumb';
import { BlogContentHeader } from '@/widgets/public/blog-details-content/ui/blog-content-header';
import { BlogReadingProgress } from '@/widgets/public/blog-details-content/ui/blog-reading-progress';
import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';
import { BlogTableOfContents } from '@/widgets/public/blog-details-content/ui/blog-table-of-contents';

const ARTICLE_ID = 'blog-article-content';

export async function BlogDetailsContent({ blog }: { blog: PublicBlog }) {
  const t = await getTranslations('blogDetails');
  const tagSlugs = blog.tags.map((tag) => tag.slug);

  return (
    <>
      <BlogReadingProgress />

      <BlogDetailsShell>
        <div className="w-full py-8 md:px-8 md:py-12">
          <BlogBreadcrumb title={blog.title} />

          <div className="flex w-full justify-center gap-10">
            {/* Main column */}
            <div className="w-full min-w-0 max-w-[760px]">
              <BlogContentHeader blog={blog} />

              {/* Mobile table of contents (hidden when < 2 headings) */}
              <div className="mt-6 xl:hidden">
                <BlogTableOfContents
                  targetId={ARTICLE_ID}
                  label={t('tableOfContents')}
                />
              </div>

              <div className="mb-8 md:mb-10" />
              <BlogContent blog={blog} />

              <div className="mt-4 md:mt-8" />
              <BlogActionBar
                blogId={blog.id}
                blogSlug={blog.slug}
                title={blog.title}
                noCommentAppear
              />

              {/* Author */}
              <Separator className="my-8 md:my-10" />
              <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
                <BlogAuthorCard
                  author={blog.author}
                  label={t('aboutTheAuthor')}
                />
              </Suspense>

              {/* Related project */}
              {blog.projectId && (
                <>
                  <Separator className="my-8 md:my-10" />
                  <Suspense
                    fallback={
                      <RelatedProjectCardSkeleton label={t('relatedProject')} />
                    }
                  >
                    <BlogRelatedProjectCard
                      projectId={blog.projectId}
                      label={t('relatedProject')}
                    />
                  </Suspense>
                </>
              )}

              {/* Related posts */}
              <Separator className="my-8 md:my-10" />
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-xl" />}
              >
                <BlogRelatedPosts
                  blogId={blog.id}
                  tagSlugs={tagSlugs}
                  label={t('relatedPosts')}
                />
              </Suspense>

              {/* Prev / Next */}
              <div className="mt-8 md:mt-10" />
              <Suspense
                fallback={<Skeleton className="h-20 w-full rounded-xl" />}
              >
                <BlogAdjacentNav
                  blogId={blog.id}
                  publishedDate={blog.publishedDate}
                  prevLabel={t('previousPost')}
                  nextLabel={t('nextPost')}
                />
              </Suspense>

              {/* Comments */}
              <Separator className="my-8 md:my-10" />
              <BlogCommentSection blogId={blog.id} />
            </div>

            {/* Desktop table of contents */}
            <aside className="hidden w-56 shrink-0 xl:block">
              <div className="sticky top-24">
                <BlogTableOfContents
                  targetId={ARTICLE_ID}
                  label={t('tableOfContents')}
                />
              </div>
            </aside>
          </div>
        </div>
      </BlogDetailsShell>

      <BlogAnalytics blogId={blog.id} />
    </>
  );
}
