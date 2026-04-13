import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { BlogsShell } from '@/widgets/public/blogs-content/ui';

export default function BlogsLoading() {
  return (
    <BlogsShell>
      <div className="container mx-auto flex flex-col items-stretch px-4 py-8">
        <Skeleton className={cn('w-full h-16')} />
        <Skeleton className={cn('mt-4 w-full h-10')} />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }, (_, index) => index + 1).map(
            (_it, index) => (
              <Skeleton
                key={index}
                className={cn(
                  'min-w-[160px] h-72 rounded-2xl border-none p-1 text-sm shadow-2xl'
                )}
              />
            )
          )}
        </div>
      </div>
    </BlogsShell>
  );
}
