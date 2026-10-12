import { Card, CardContent, CardHeader, Skeleton } from '@byte-of-me/ui';

/** Stands in for the project cards of `ProjectManager` while page 1 loads. Same classes as a `ProjectEditorCard`. */
export function ProjectListLoading() {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Card
          key={i}
          className="flex flex-col justify-between border-border/50 bg-card"
        >
          <CardHeader className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>

            <div className="space-y-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardHeader>

          <CardContent className="flex items-center gap-3 p-5 pt-0">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
