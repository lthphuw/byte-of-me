import { Suspense } from 'react';

import { HomepageShell } from './homepage-shell';

import {
  HomepageContactCta,
  HomepageEducation,
  HomepageEducationLoading,
  HomepageOpenSource,
  HomepageOpenSourceLoading,
  HomepageProfile,
  HomepageProfileLoading,
  HomepageRecentProjects,
  HomepageRecentProjectsLoading,
  HomepageTechStack,
  HomepageTechStackLoading,
} from '@/features/public';
import { RevealSection } from '@/shared/ui';

/**
 * The whole public introduction on one page: who, what was contributed
 * upstream, what was built, where from, what with, then the way to reach out.
 * It absorbed `/about`, so each block stays short and links onward for detail.
 */
export async function HomepageContent() {
  return (
    <HomepageShell>
      {/* A <div>, not <main>: the public layout already provides the page's
          <main> landmark, and nesting a second one is invalid and leaves screen
          readers with two "main" regions to choose between.
          The width comes from HomepageShell — a max-width here would sit inside
          the shell's narrower one and never apply. */}
      <div
        id="home"
        className="space-y-12 md:space-y-16"
      >
        <RevealSection delay={0.1}>
          <Suspense fallback={<HomepageProfileLoading />}>
            <HomepageProfile />
          </Suspense>
        </RevealSection>

        {/* `empty:hidden` on the three optional blocks: each renders nothing
            when its data is missing (no token, GitHub down, nothing authored),
            and an empty wrapper would still add a `space-y` gap. */}
        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageOpenSourceLoading />}>
            <HomepageOpenSource />
          </Suspense>
        </RevealSection>

        <RevealSection>
          <Suspense fallback={<HomepageRecentProjectsLoading />}>
            <HomepageRecentProjects />
          </Suspense>
        </RevealSection>

        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageEducationLoading />}>
            <HomepageEducation />
          </Suspense>
        </RevealSection>

        <RevealSection className="empty:hidden">
          <Suspense fallback={<HomepageTechStackLoading />}>
            <HomepageTechStack />
          </Suspense>
        </RevealSection>

        <RevealSection>
          <HomepageContactCta />
        </RevealSection>
      </div>
    </HomepageShell>
  );
}
