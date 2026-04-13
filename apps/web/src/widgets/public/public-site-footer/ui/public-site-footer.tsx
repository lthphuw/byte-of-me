import { Suspense } from 'react';

import {
  PublicSiteFooter as PublicSiteFooterFeature,
  PublicSiteFooterLoading,
} from '@/features/public/public-site-footer';

export function PublicSiteFooter() {
  return (
    <Suspense fallback={<PublicSiteFooterLoading />}>
      <PublicSiteFooterFeature className="border-t" />
    </Suspense>
  );
}
