import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container py-10 px-4">
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="w-full aspect-video rounded-2xl" />{' '}
          <div className="space-y-4 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>

        <div className="hidden lg:block w-80 space-y-10">
          <div className="space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
