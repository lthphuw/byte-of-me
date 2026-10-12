import { Skeleton } from '@byte-of-me/ui';

/**
 * Route-level skeleton for a dashboard page: the page header, then a column of
 * rows. It keeps the shape of a manager page so the page does not jump when its
 * own list skeleton takes over. Rendered inside the dashboard layout's content
 * area, so it does not overlay the sidebar or hardcode its width.
 */
export function DashboardPageLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
