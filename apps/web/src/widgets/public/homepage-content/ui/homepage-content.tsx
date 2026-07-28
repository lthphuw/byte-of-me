import { Suspense } from 'react';

import { HomepageShell } from './homepage-shell';

import {
  HomepageContactCta,
  HomepageProfile,
  HomepageProfileLoading,
  HomepageRecentProjects,
  HomepageRecentProjectsLoading,
} from '@/features/public';
import { RevealSection } from '@/shared/ui';

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
        className="space-y-16 md:space-y-24"
      >
        <RevealSection delay={0.1}>
          <Suspense fallback={<HomepageProfileLoading />}>
            <HomepageProfile />
          </Suspense>
        </RevealSection>

        <RevealSection>
          <Suspense fallback={<HomepageRecentProjectsLoading />}>
            <HomepageRecentProjects />
          </Suspense>
        </RevealSection>

        <RevealSection>
          <HomepageContactCta />
        </RevealSection>
      </div>
    </HomepageShell>
  );
}
