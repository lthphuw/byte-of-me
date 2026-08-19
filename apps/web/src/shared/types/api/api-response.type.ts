/**
 * `errorMsg` is an English sentence: fine for a log or an admin surface, wrong
 * for the public site, where a Vietnamese visitor was shown it verbatim. An
 * action that can distinguish its failures adds `errorCode` so the caller can
 * translate the reason itself, and names its vocabulary through `TErrorCode`.
 *
 * Both stay: the code is additive, `errorMsg` remains the fallback for the
 * callers — and the future codes — that do not know the vocabulary.
 */
export type ApiResponse<T, TErrorCode extends string = string> =
  | { success: true; data: T; errorMsg?: never; errorCode?: never }
  | { success: false; data?: never; errorMsg: string; errorCode?: TErrorCode };
