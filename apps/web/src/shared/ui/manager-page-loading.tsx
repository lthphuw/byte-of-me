import { Skeleton } from '@byte-of-me/ui';

import { RecordListSkeleton } from './record-list';

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/** A record's form while the record loads: each field at its input's height. */
function FormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
      <FieldSkeleton />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

interface ManagerPageLoadingProps {
  variant: 'list' | 'grid' | 'form';
}

/**
 * The loading state of a dashboard page: the page header, then the body the
 * page renders. Route `loading.tsx` and the client loading state both use it.
 */
export function ManagerPageLoading({ variant }: ManagerPageLoadingProps) {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      {variant === 'form' ? (
        <FormSkeleton />
      ) : (
        <RecordListSkeleton variant={variant} />
      )}
    </div>
  );
}
