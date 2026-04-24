'use client';

import { Card, CardContent , Skeleton } from '@/shared/ui';

interface ProjectCardSkeletonProps {
  compact?: boolean;
}

export function ProjectCardSkeleton({ compact }: ProjectCardSkeletonProps) {
  return (
    <Card className="flex h-full flex-col rounded-xl border-border/40 bg-card">
      <CardContent className="flex flex-1 flex-col p-5">
        {/* HEADER SKELETON */}
        <div className="mb-3 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            {/* Title */}
            <Skeleton className="h-7 w-2/3 rounded-md" />
            {/* Active Badge placeholder (optional) */}
            <Skeleton className="h-4 w-12 rounded-full opacity-50" />
          </div>

          {/* Date range */}
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>

        {/* DESCRIPTION SKELETON */}
        <div className="mb-5 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* METADATA SKELETON */}
        {!compact && (
          <div className="mt-auto space-y-3">
            {/* Tech Stack Badges */}
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-14 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>

            {/* Tag Badges */}
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        )}

        {/* ACTIONS SKELETON */}
        <div className="mt-5 flex items-center gap-2 border-t pt-5">
          {/* Primary Action Button */}
          <Skeleton className="h-8 flex-1 rounded-lg" />
          {/* Secondary/Icon Action Button */}
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
