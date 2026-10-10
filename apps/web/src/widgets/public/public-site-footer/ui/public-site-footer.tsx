import { Suspense } from 'react';

import {
  PublicSiteFooter,
  PublicSiteFooterLoading,
} from '@/features/public/public-site-footer/ui';
import { ContentFade } from '@/shared/ui/content-fade';

/**
 * Suspense boundary around the data-fetching footer feature, so a slow
 * profile/social-link read never blocks the rest of the page. The footer is the
 * last thing on every public page, so its swap from the skeleton is the one a
 * visitor who reaches the bottom sees: it fades in rather than popping.
 */
export function PublicSiteFooterSection() {
  return (
    <Suspense fallback={<PublicSiteFooterLoading />}>
      <ContentFade>
        <PublicSiteFooter className="border-t" />
      </ContentFade>
    </Suspense>
  );
}
