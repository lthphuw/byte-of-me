import { BlogManager } from '@/widgets/dashboard/blog-manager/ui/blog-manager';

export const metadata = { title: 'Blogs' };

export default async function BlogsPage() {
  return (
      <BlogManager />
  );
}
