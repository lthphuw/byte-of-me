import { Suspense } from 'react';

import {
  PublicSiteFooter,
  PublicSiteFooterLoading,
} from '@/features/public/public-site-footer/ui';

/**
 * Suspense boundary around the data-fetching footer feature, so a slow
 * profile/social-link read never blocks the rest of the page.
 */
export function PublicSiteFooterSection() {
  return (
    <Suspense fallback={<PublicSiteFooterLoading />}>
      <PublicSiteFooter className="border-t" />
    </Suspense>
  );
}
