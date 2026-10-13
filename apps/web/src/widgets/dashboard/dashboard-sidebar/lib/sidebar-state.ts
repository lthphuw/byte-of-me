export const SIDEBAR_COOKIE = 'dashboard-sidebar';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Absent or unknown means expanded: the wide sidebar is the default. */
export function isSidebarExpanded(cookieValue: string | undefined): boolean {
  return cookieValue !== 'collapsed';
}

/** Client only. The dashboard layout reads the same cookie on the next request. */
export function persistSidebarExpanded(expanded: boolean): void {
  const value = expanded ? 'expanded' : 'collapsed';
  document.cookie = `${SIDEBAR_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
