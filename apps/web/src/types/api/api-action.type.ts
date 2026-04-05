export type ApiActionResponse<T> =
  | { success: true; data: T; errorMsg?: never }
  | { success: false; data?: never; errorMsg: string };
