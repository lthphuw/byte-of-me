import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the `ProjectForm` while its record loads. Same wrappers and field sizes as the form. */
export function ProjectFormLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldLoading />
        <div className="grid grid-cols-2 gap-2">
          <FieldLoading />
          <FieldLoading />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldLoading />
        <FieldLoading />
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldLoading />
        <FieldLoading />
      </div>

      <div className="space-y-4 border-t pt-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  );
}

function FieldLoading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
