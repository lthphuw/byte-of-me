import { Skeleton } from '@byte-of-me/ui';

/**
 * Holds the achievements field's place while its chunk loads (`dynamic`
 * in `education-form.tsx`). Same root and header classes as the field.
 */
export function EducationAchievementsFieldLoading() {
  return (
    <div className="space-y-4 border-t pt-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
