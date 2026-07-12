import { Loading } from '@byte-of-me/ui';

/**
 * Shared route-level loading state for dashboard pages. Rendered inside the
 * dashboard layout's content area, so it must not overlay the sidebar or
 * hardcode its width.
 */
export function DashboardPageLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loading size={45} />
    </div>
  );
}
