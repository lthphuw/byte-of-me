import { getLocale } from 'next-intl/server';

import { ApiResponse } from '@/types/api';
import { host } from '@/config/host';
import { revalidateTime } from '@/config/revalidate';

import { resolveRelativeImages } from './markdown';

export type FetchOptions = {
  cache?: RequestCache;
  params?: Record<string, string>;
};

export async function fetchData<T>(
  endpoint: string,
  { cache = 'force-cache', params }: FetchOptions = {}
): Promise<T> {
  const locale = await getLocale();
  const searchParams = new URLSearchParams();
  searchParams.append('locale', locale || 'en');

  let api = `${host}/api/${endpoint}`;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, value);
    }
  }
  api += `?${searchParams.toString()}`;

  const resp = await fetch(api, {
    cache,
    next: {
      revalidate: revalidateTime,
      tags: [`all`,`${endpoint}`],
    },
  });

  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(`Failed to fetch ${api}: ${JSON.stringify(data)}`);
  }

  const { data }: ApiResponse<T> = await resp.json();
  return data;
}
