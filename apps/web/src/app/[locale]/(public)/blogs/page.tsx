import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { setRequestLocale } from 'next-intl/server';

import { getPaginatedPublicBlogs } from '@/entities/blog';
import { blogKeys } from '@/entities/blog/model/query-keys';
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
  // client fetch.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: blogKeys.publicList(1, { tagSlugs: [], search: '' }),
    queryFn: () =>
      getPaginatedPublicBlogs({ tagSlugs: [], search: '', page: 1, limit: 6 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogsContent />
    </HydrationBoundary>
  );
}
