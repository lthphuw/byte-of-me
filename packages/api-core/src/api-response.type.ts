/**
 * `errorMsg` is an English sentence, wrong for the public site. An action that
 * can tell its failures apart adds `errorCode` (vocabulary `TErrorCode`) for
 * the caller to translate; `errorMsg` stays as the fallback.
 */
export type ApiResponse<T, TErrorCode extends string = string> =
  | { success: true; data: T; errorMsg?: never; errorCode?: never }
  | { success: false; data?: never; errorMsg: string; errorCode?: TErrorCode };
