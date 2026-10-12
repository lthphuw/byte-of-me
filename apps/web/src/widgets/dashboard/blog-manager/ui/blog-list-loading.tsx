import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Skeleton,
} from '@byte-of-me/ui';

/** Stands in for the post cards of `BlogManager` while page 1 loads. Same classes as `BlogEditorCard`. */
export function BlogListLoading() {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Card
          key={i}
          className="flex h-full flex-col overflow-hidden border-muted-foreground/10"
        >
          <Skeleton className="aspect-video w-full rounded-none border-b" />

          <CardHeader className="space-y-1 p-4 pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>

          <CardContent className="flex-grow p-4 pt-0">
            <Skeleton className="mb-4 h-4 w-full" />
            <div className="mt-auto flex flex-wrap gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t bg-muted/5 p-3">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
