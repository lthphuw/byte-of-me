import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { setRequestLocale } from 'next-intl/server';

import { getPaginatedPublicBlogs } from '@/entities/blog';
import { blogKeys } from '@/entities/blog/model/query-keys';
import { DEFAULT_BLOG_FILTERS } from '@/features/public';
import { routing } from '@/shared/i18n/routing';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import type { LocaleType } from '@/shared/types';
import { BlogsContent } from '@/widgets/public';

// No `force-dynamic`: the prefetched list now goes through a tagged
// `unstable_cache` entry (CACHE_TAGS.BLOG), so publishing or editing a post
// purges both the data cache and this prerendered page. Rendering the list on
// every request would only re-run the same cached query.

interface BlogsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function BlogsPage({ params }: BlogsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale as LocaleType);

  // Server-render the default (unfiltered) first page so its data is in the
  // initial HTML — the client hydrates it instantly instead of relying on a
  // first client-side fetch (which was leaving the default list stuck on
  // skeletons). Filtering changes the query key and falls through to a live
  // client fetch. `DEFAULT_BLOG_FILTERS` is the exact shape `useBlogFilters`
  // produces when the URL carries no filter params, so the prefetch key and
  // the client key stay structurally identical instead of drifting as two
  // hand-kept literals. It resolves to `blog-filters/lib/blog-filter-params`,
  // which carries no `'use client'` directive — imported out of the hook file
  // it arrived here as a client-reference proxy and the hash drifted.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: blogKeys.publicList(1, DEFAULT_BLOG_FILTERS),
    queryFn: () =>
      getPaginatedPublicBlogs({
        ...DEFAULT_BLOG_FILTERS,
        page: 1,
        limit: 6,
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogsContent />
    </HydrationBoundary>
  );
}
