import { getRelatedPublicBlogs } from '@/entities/blog/api/get-related-public-blogs';
import { BlogCard } from '@/entities/blog/ui/blog-card';

export async function BlogRelatedPosts({
  blogId,
  tagSlugs,
  label,
}: {
  blogId: string;
  tagSlugs: string[];
  label: string;
}) {
  if (tagSlugs.length === 0) return null;

  const resp = await getRelatedPublicBlogs(blogId, tagSlugs, 3);
  const posts = resp.success ? resp.data : [];
  if (posts.length === 0) return null;

  return (
    <section aria-label={label} className="space-y-4 md:space-y-6">
      <h2 className="text-xl font-bold tracking-tight">{label}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} blog={post} />
        ))}
      </div>
    </section>
  );
}
