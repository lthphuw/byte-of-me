import { BlogCardSkeleton } from '@/entities/blog/ui/blog-card-skeleton';

/** The related-posts section while its cards load: the heading and the three-card grid, as `BlogRelatedPosts` lays them out. */
export function BlogRelatedPostsSkeleton({ label }: { label: string }) {
  return (
    <section aria-label={label} className="space-y-4 md:space-y-6">
      <h2 className="text-xl font-bold tracking-tight">{label}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
