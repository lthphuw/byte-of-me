import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { BlogContent } from './blog-content';
import { BlogHeader } from './blog-header';

import type { PublicBlog } from '@/entities/blog';
import { BlogAnalytics } from '@/features/public';
import { Separator } from '@/shared/ui/separator';
import { BlogActionBar } from '@/widgets/public/blog-details-content/ui/blog-action-bar';
import { BlogCommentSection } from '@/widgets/public/blog-details-content/ui/blog-comment-section';
import { BlogDetailsShell } from '@/widgets/public/blog-details-content/ui/blog-shells';
import { RelatedProjectCard } from '@/widgets/public/blog-details-content/ui/related-project-card';
import { RelatedProjectCardSkeleton } from '@/widgets/public/blog-details-content/ui/related-project-card-loading';

export async function BlogDetailsContent({ blog }: { blog: PublicBlog }) {
  const t = await getTranslations('blogDetails');

  return (
    <>
      <BlogDetailsShell>
        <div className="flex w-full min-w-0 flex-col items-center overflow-hidden py-8 md:px-8 md:py-12">
          <div className="w-full min-w-0 max-w-3xl">
            {/*Header*/}
            <BlogHeader blog={blog} />

            {/*Actions*/}
            <BlogActionBar blogId={blog.id} title={blog.title} />

            {/*Content*/}
            <Separator className="mb-8 md:mb-10" />
            <BlogContent blog={blog} />

            {/*Blog comments section*/}
            <Separator className="my-8 md:my-10" />
            <BlogCommentSection blogId={blog.id} />

            {/*Related project*/}
            {blog.projectId && (
              <>
                <Separator className="my-8 md:my-10" />

                <Suspense
                  fallback={
                    <RelatedProjectCardSkeleton label="Related Project" />
                  }
                >
                  <RelatedProjectCard
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
