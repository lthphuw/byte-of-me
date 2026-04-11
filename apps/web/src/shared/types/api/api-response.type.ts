export type ApiResponse<T> =
  | { success: true; data: T; errorMsg?: never }
  | { success: false; data?: never; errorMsg: string };
