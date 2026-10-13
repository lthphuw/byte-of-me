import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the tag form while its record loads: the slug field, then the language tabs and a name field. */
export function TagFormLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="space-y-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
