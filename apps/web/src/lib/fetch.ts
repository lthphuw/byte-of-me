import { getLocale } from 'next-intl/server';

import { ApiResponse } from '@/types/api';
import { host } from '@/config/config';

export type FetchOptions = {
  cache?: RequestCache;
};

export async function fetchData<T>(
  endpoint: string,
  { cache }: FetchOptions = { cache: 'force-cache' }
): Promise<T> {
  const locale = await getLocale();
  const api = `${host}/api/${endpoint}?locale=${locale}`;

  const resp = await fetch(api, {
    cache,
    next: {
      revalidate: 86400,
      tags: [`${endpoint}-${locale}`],
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch ${api}: ${JSON.stringify(resp)}`);
  }

  const { data }: ApiResponse<T> = await resp.json();
  return data;
}

// const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);

export async function fetchREADMEData(
  githubUrl: string,
  { cache }: FetchOptions = { cache: 'force-cache' }
): Promise<string> {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  const repo = match?.[1];
  if (!repo) {
    throw new Error(`Cannot extract repo from URL: ${githubUrl}`);
  }

  const readmeCandidates = ['README.md', 'readme.md', 'Readme.md'];
  for (const file of readmeCandidates) {
    const url = `https://raw.githubusercontent.com/${repo}/main/${file}`;
    const resp = await fetch(url, {
      cache,
      next: {
        revalidate: 86400,
        tags: [githubUrl],
      },
    });

    if (resp.ok) {
      return await resp.text();
    }
  }

  throw new Error(`README.md not found in ${repo}`);
}
