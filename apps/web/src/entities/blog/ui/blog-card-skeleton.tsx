import { Card, CardContent, CardFooter, CardHeader , Skeleton } from '@/shared/ui';

export function BlogCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-2">
      {/* Cover Image Area */}
      <Skeleton className="aspect-video w-full rounded-none" />

      <CardHeader className="space-y-2 p-4">
        {/* Metadata row */}
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>

        {/* Description */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
        </div>
      </CardHeader>

      <CardContent className="mt-auto px-4 pb-4">
        {/* Tags */}
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/30 p-4">
        <Skeleton className="h-5 w-24" />
      </CardFooter>
    </Card>
  );
}
