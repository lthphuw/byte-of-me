/**
 * Rows per manager page. The query key carries the page but not the limit, so
 * a prefetch and `useCrudManager` that disagree hydrate the wrong rows.
 */
export const ADMIN_PAGE_SIZE = 12;

/**
 * Ceiling on an admin `*Options` read. Explicit because `clampPagination`
 * caps at 50 and silently truncated the pickers; newest rows win past this.
 */
export const ADMIN_OPTIONS_LIMIT = 500;
