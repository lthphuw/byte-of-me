import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { setRequestLocale } from 'next-intl/server';

import { getPaginatedPublicBlogs } from '@/entities';
import { routing } from '@/shared/i18n/routing';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import type { LocaleType } from '@/shared/types';
import { BlogsContent } from '@/widgets/public';

// Render fresh on every request instead of freezing at build time. The public
// layout is `force-static`, which would otherwise bake this list's data into
// the static HTML forever; the blog list is dynamic (new posts must show up), so
// this page opts out.
export const dynamic = 'force-dynamic';

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
  // client fetch. The key must match BlogsContent's initial key exactly.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['public-blogs', 1, { tagSlugs: [], search: '' }],
    queryFn: () =>
      getPaginatedPublicBlogs({ tagSlugs: [], search: '', page: 1, limit: 6 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogsContent />
    </HydrationBoundary>
  );
}
