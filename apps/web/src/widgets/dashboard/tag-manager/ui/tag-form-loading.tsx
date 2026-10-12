import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the `TagDialog` form while its record loads. Same wrappers and field sizes as the form. */
export function TagFormLoading() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <div className="w-20 space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
