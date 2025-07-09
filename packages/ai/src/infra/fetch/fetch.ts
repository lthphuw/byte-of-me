import { env } from '../../env.mjs';
import { ApiResponse, FetchOptions } from '../../types/api';

export async function fetchData<T>(
  endpoint: string,
  { locale, cache }: FetchOptions,
): Promise<T> {
  const api = `${env.HOST}/api/${endpoint}?locale=${locale}`;
  const resp = await fetch(api, {
    cache,
  });

  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(`Failed to fetch ${api}: ${JSON.stringify(data)}`);
  }

  const { data }: ApiResponse<T> = await resp.json();
  return data;
}
