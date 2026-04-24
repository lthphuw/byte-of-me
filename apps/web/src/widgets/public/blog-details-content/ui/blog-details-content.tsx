import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { BlogContent } from './blog-content';

import type { PublicBlog } from '@/entities/blog';
import {
  BlogAnalytics,
  BlogCommentSection,
  BlogRelatedProjectCard,
  RelatedProjectCardSkeleton,
} from '@/features/public';
import { Separator } from '@/shared/ui';
import { BlogActionBar } from '@/widgets/public/blog-details-content/ui/blog-action-bar';
import { BlogContentHeader } from '@/widgets/public/blog-details-content/ui/blog-content-header';
import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';

export async function BlogDetailsContent({ blog }: { blog: PublicBlog }) {
  const t = await getTranslations('blogDetails');

  return (
    <>
      <BlogDetailsShell>
        <div className="flex w-full flex-col items-center py-8 md:px-8 md:py-12">
          <div className="w-full max-w-[calc(100vw-4rem)]">
            {/*Header*/}
            <BlogContentHeader blog={blog} />

            {/*Content*/}
            <div className="mb-8 md:mb-10" />
            <BlogContent blog={blog} />

            {/*Blog actions section, but for footer, user dont need to scroll upper*/}
            <div className="mt-4 md:mt-8" />
            <BlogActionBar
              blogId={blog.id}
              blogSlug={blog.slug}
              title={blog.title}
              noCommentAppear
            />

            {/*Blog comments section*/}
            <Separator className="mb-8 md:mb-10" />
            <BlogCommentSection blogId={blog.id} />

            {/*Related project*/}
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
          </div>
        </div>
      </BlogDetailsShell>
      <BlogAnalytics blogId={blog.id} />
    </>
  );
}
