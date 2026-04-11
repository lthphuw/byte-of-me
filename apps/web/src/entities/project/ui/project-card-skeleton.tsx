import { Card, CardContent, CardFooter } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

interface ProjectCardSkeletonProps {
  compact?: boolean;
}

export function ProjectCardSkeleton({ compact }: ProjectCardSkeletonProps) {
  return (
    <Card className="rounded-2xl flex flex-col h-full border border-border/50">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* TITLE & DATE SECTION */}
        <div className="flex flex-col gap-1">
          {/* Title - text-lg matches height approx 28px */}
          <Skeleton className="h-7 w-3/4 rounded-md" />

          {/* Year - text-xs matches height approx 16px */}
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>

        {/* DESCRIPTION SECTION - line-clamp-3 simulation */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {!compact && (
          <>
            {/* TECH STACK BADGES */}
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>

            {/* TAG BADGES */}
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </>
        )}
      </CardContent>

      {/* FOOTER - Buttons aligned to end */}
      <CardFooter className="p-5 pt-0 flex gap-2 justify-end">
        {/* GitHub Button Skeleton */}
        <Skeleton className="h-9 w-24 rounded-md" />
        {/* Live Button Skeleton */}
        <Skeleton className="h-9 w-20 rounded-md" />
      </CardFooter>
    </Card>
  );
}
