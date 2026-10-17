import { Suspense } from 'react';
import { ContentFade } from '@byte-of-me/ui';

import {
  PublicSiteFooter,
  PublicSiteFooterLoading,
} from '@/features/public/public-site-footer/ui';

/**
 * Suspense boundary around the data-fetching footer: a slow profile/social-link read never
 * blocks the page. The skeleton swap is seen by whoever reaches the bottom, so it fades in.
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
