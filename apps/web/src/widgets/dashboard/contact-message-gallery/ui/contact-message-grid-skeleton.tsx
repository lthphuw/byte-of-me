import { Card, CardContent, CardHeader, Skeleton } from '@byte-of-me/ui';

/** Six message cards in the gallery's grid, shaped like a loaded card (AGENTS §14). */
export function ContactMessageGridSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardHeader className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-4 h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
