import { Card, CardContent, CardHeader, Skeleton } from '@byte-of-me/ui';

const BAR_HEIGHTS = [
  35, 55, 25, 70, 45, 60, 30, 80, 50, 40, 65, 28, 75, 48, 58, 33, 68, 42, 52,
  26, 72, 46, 62, 36, 78, 44, 56, 30, 66, 50,
];

export function AnalyticsOverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Views chart skeleton */}
        <Card className="border-none bg-card/60 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-0.5">
              {BAR_HEIGHTS.map((height, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-6" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top posts skeleton */}
        <Card className="border-none bg-card/60 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stat tiles skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="border-none bg-card/60 shadow-sm backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
