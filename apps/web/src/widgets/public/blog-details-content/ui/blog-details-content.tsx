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
import { BlogCitationLinks } from '@/widgets/public/blog-details-content/ui/blog-citation-links';
import { BlogContentHeader } from '@/widgets/public/blog-details-content/ui/blog-content-header';
import { BlogReaderNav } from '@/widgets/public/blog-details-content/ui/blog-reader-nav';
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
        <div className="w-full">
          {/*
            Three tracks on wide screens: the article sits in the centre one so
            it stays optically centred on the page, and the rail fills the right
            margin instead of pushing the text off-centre.
          */}
          <div className="grid grid-cols-1 gap-x-6 md:gap-x-10 xl:grid-cols-[1fr_minmax(0,720px)_1fr]">
            {/* Main column */}
            <div className="mx-auto w-full min-w-0 max-w-[720px] xl:col-start-2 xl:mx-0">
              <BlogBreadcrumb title={blog.title} />

              <BlogContentHeader blog={blog} />

              {/* Below `xl` the headings and the bibliography live in
                  `BlogReaderNav` — a button in the corner, rendered at the end
                  of this file so it is not inside the article's stacking
                  context. Nothing sits over the text any more. */}
              <div className="mb-8 md:mb-12" />
              <BlogContent blog={blog} />

              <div className="mt-4 md:mt-6" />
              <BlogActionBar
                blogId={blog.id}
                blogSlug={blog.slug}
                title={blog.title}
                noCommentAppear
              />

              {/* Author */}
              <Separator className="my-8 md:my-12" />
              <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
                <BlogAuthorCard
                  author={blog.author}
                  label={t('aboutTheAuthor')}
                />
              </Suspense>

              {/* Related project */}
              {blog.projectId && (
                <>
                  <Separator className="my-8 md:my-12" />
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
              <Separator className="my-8 md:my-12" />
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
              <div className="mt-8 md:mt-12" />
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
              <Separator className="my-8 md:my-12" />
              <BlogCommentSection blogId={blog.id} />
            </div>

            {/* Desktop table of contents */}
            <aside className="hidden xl:col-start-3 xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pl-6">
                <BlogTableOfContents
                  targetId={ARTICLE_ID}
                  label={t('tableOfContents')}
                />
              </div>
            </aside>
          </div>
        </div>
      </BlogDetailsShell>

      <BlogReaderNav
        targetId={ARTICLE_ID}
        contentsLabel={t('tableOfContents')}
        referencesLabel={t('references')}
      />

      <BlogCitationLinks targetId={ARTICLE_ID} />
      <BlogAnalytics blogId={blog.id} />
    </>
  );
}
