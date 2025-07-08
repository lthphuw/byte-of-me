export type ApiResponse<T> = {
  data: T;
  error?: string;
};

export type FetchOptions = {
  locale: string;
  cache?: RequestCache;
};
