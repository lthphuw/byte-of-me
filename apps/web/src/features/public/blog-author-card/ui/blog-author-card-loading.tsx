import { Card, Skeleton } from '@byte-of-me/ui';

/** The author card while its profile loads: the avatar and the text column `BlogAuthorCard` renders. */
export function BlogAuthorCardSkeleton() {
  return (
    <Card className="flex items-start gap-4 p-5">
      <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
    </Card>
  );
}
