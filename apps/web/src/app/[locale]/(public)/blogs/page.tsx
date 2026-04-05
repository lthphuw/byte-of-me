import { getTranslations } from 'next-intl/server';

import { getDataForBlogsPage } from '@/lib/actions/public/get-data-for-blogs-page';
import { getPaginatedPublicBlogs } from '@/lib/actions/public/get-paginated-public-blogs';
import { BlogsContent } from '@/components/blogs-content';
import { BlogsShell } from '@/components/shell';

export default async function BlogsPage() {
  const t = await getTranslations('blog');
  const [blogsResp, dataResp] = await Promise.all([
    getPaginatedPublicBlogs({
      page: 1,
      limit: 9,
    }),
    getDataForBlogsPage(),
  ]);

  if (!dataResp.success || !blogsResp.success) {
    return (
      <BlogsShell>
        <div className="p-4">
          <p className="text-red-500">{t('failedToLoadBlogList')}</p>
        </div>
      </BlogsShell>
    );
  }

  return (
    <BlogsShell>
      <BlogsContent initBlogs={blogsResp.data} tags={dataResp.data.tags} />
    </BlogsShell>
  );
}
