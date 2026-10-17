import { Suspense } from 'react';

import { HomepageShell } from './homepage-shell';

import {
  HomepageContactCta,
  HomepageEducation,
  HomepageEducationLoading,
  HomepageFeaturedWorks,
  HomepageFeaturedWorksLoading,
  HomepageOpenSource,
  HomepageOpenSourceLoading,
  HomepageProfile,
  HomepageProfileLoading,
} from '@/features/public';
import { RevealSection } from '@/shared/ui';

/**
 * The whole public introduction on one page: who, what was featured, what was
 * contributed upstream, where from, then the way to reach out.
 * It absorbed `/about`, so each block stays short and links onward for detail.
 */
export async function HomepageContent() {
  return (
    <HomepageShell>
      {/* A <div>, not <main>: the public layout already provides the <main> landmark, and a second
          is invalid. Width comes from HomepageShell: a max-width here would sit inside its
          narrower one and never apply. */}
      <div id="home" className="space-y-12 md:space-y-16">
        {/* `immediate`: the profile holds the page's LCP element (the h1). */}
        <RevealSection immediate>
          <Suspense fallback={<HomepageProfileLoading />}>
            <HomepageProfile />
          </Suspense>
        </RevealSection>

        {/* `empty:hidden` on the optional blocks: each renders nothing when its
            data is missing (no token, nothing authored), and an empty wrapper
            would still add a `space-y` gap. A failed read renders its error. */}
        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageFeaturedWorksLoading />}>
            <HomepageFeaturedWorks />
          </Suspense>
        </RevealSection>

        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageOpenSourceLoading />}>
            <HomepageOpenSource />
          </Suspense>
        </RevealSection>

        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageEducationLoading />}>
            <HomepageEducation />
          </Suspense>
        </RevealSection>

        <RevealSection>
          <HomepageContactCta />
        </RevealSection>
      </div>
    </HomepageShell>
  );
}
