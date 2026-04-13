import { getPaginatedAdminBlog } from '@/entities/blog/api/get-paginated-admin-blogs';
import { BlogManager } from '@/widgets/dashboard/blog-manager/ui/blog-manager';

export const metadata = { title: 'Blogs' };

export default async function EducationsPage() {
  const resp = await getPaginatedAdminBlog(1, 12);
  if (!resp.success) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BlogManager initData={resp.data} />
    </div>
  );
}
