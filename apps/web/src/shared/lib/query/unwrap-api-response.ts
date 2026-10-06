import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Actions resolve with an envelope instead of throwing; a query function must
 * throw on `{ success: false }` for TanStack to see an error. Shared so the
 * client hook and the server prefetch cache the same value.
 */
export function unwrapApiResponse<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.errorMsg);
  return res.data;
}
