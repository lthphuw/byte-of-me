import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** A refused action. `errorCode` is set only when the action names its reason. */
export class ServerActionError extends Error {
  readonly errorCode: string | undefined;

  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = 'ServerActionError';
    this.errorCode = errorCode;
  }
}

/**
 * Actions resolve with an envelope instead of throwing; a query or mutation
 * function must throw on `{ success: false }` for TanStack to see an error.
 * Shared so the client hook and the server prefetch cache the same value.
 */
export function unwrapApiResponse<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new ServerActionError(res.errorMsg, res.errorCode);
  return res.data;
}
