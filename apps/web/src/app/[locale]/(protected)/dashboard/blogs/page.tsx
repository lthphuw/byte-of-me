import { getPaginatedBlog } from '@/lib/actions/dashboard/blog/get-paginated-blogs';
import { BlogManager } from '@/components/blog-manager';

export const metadata = { title: 'Blogs' };

export default async function BlogsPage() {
  const resp = await getPaginatedBlog(1, 12);
  if (!resp.success) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BlogManager initData={resp.data}/>
    </div>
  );
}
