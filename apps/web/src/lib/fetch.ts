import { getLocale } from 'next-intl/server';

import { ApiResponse } from '@/types/api';
import { host } from '@/config/config';

export type FetchOptions = {
  cache?: RequestCache;
};
export async function fetchData<T>(
  endpoint: string,
  { cache }: FetchOptions = { cache: 'no-store' }
): Promise<T> {
  const locale = await getLocale();
  const api = `${host}/api/${endpoint}?locale=${locale}`;
  const resp = await fetch(api, {
    cache,
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch ${api}: ${JSON.stringify(resp)}`);
  }

  const { data }: ApiResponse<T> = await resp.json();
  return data;
}
