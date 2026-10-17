import { getQueryClient } from '@byte-of-me/query';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { setRequestLocale } from 'next-intl/server';

import { blogQueries } from '@/entities/blog/query';
import { tagQueries } from '@/entities/tag/query';
import { BLOG_FILTER_TAG_LIMIT, DEFAULT_BLOG_FILTERS } from '@/features/public';
import { routing } from '@/shared/i18n/routing';
import type { LocaleType } from '@/shared/types';
import { BlogsContent } from '@/widgets/public';

// No `force-dynamic`: the prefetched list goes through a tagged `unstable_cache` (CACHE_TAGS.BLOG), so
// publishing or editing purges both the data cache and this prerendered page.

interface BlogsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function BlogsPage({ params }: BlogsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  // Prefetch the default first page and the tag chips (same key/limit as `BlogFilters`) so the client
  // hydrates instead of fetching. DEFAULT_BLOG_FILTERS lives in a module without 'use client':
  // imported from the hook it arrived as a client-reference proxy and the key hash drifted.
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(blogQueries.publicList(1, DEFAULT_BLOG_FILTERS)),
    queryClient.prefetchInfiniteQuery(tagQueries.infinite(BLOG_FILTER_TAG_LIMIT)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogsContent />
    </HydrationBoundary>
  );
}
