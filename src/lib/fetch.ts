import { host } from '@/config/config';
import { ApiResponse } from '@/types/api';
import { getLocale } from 'next-intl/server';
export type FetchOptions = {
    cache?: RequestCache
}
export async function fetchData<T>(endpoint: string, { cache }: FetchOptions = { cache: "no-store" }): Promise<T> {
    const locale = await getLocale();
    const res = await fetch(`${host}/api/${endpoint}?locale=${locale}`, { cache });

    if (!res.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${res}`);
    }

    const { data }: ApiResponse<T> = await res.json();
    return data;
}