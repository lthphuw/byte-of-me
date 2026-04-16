import { Suspense } from 'react';

import { HomepageSectionMotion } from './homepage-section-motion';
import { HomepageShell } from './homepage-shell';

import {
  HomepageContactCta,
  HomepageProfile,
  HomepageProfileLoading,
  HomepageRecentProjects,
  HomepageRecentProjectsLoading,
} from '@/features/public';

export async function HomepageContent() {
  return (
    <HomepageShell>
      <main
        id="home"
        className="mx-auto max-w-6xl space-y-16 px-0 py-14 md:space-y-28 md:px-8 md:py-20"
      >
        <HomepageSectionMotion delay={0.1}>
          <Suspense fallback={<HomepageProfileLoading />}>
            <HomepageProfile />
          </Suspense>
        </HomepageSectionMotion>

        <HomepageSectionMotion>
          <Suspense fallback={<HomepageRecentProjectsLoading />}>
            <HomepageRecentProjects />
          </Suspense>
        </HomepageSectionMotion>

        <HomepageSectionMotion>
          <HomepageContactCta />
        </HomepageSectionMotion>
      </main>
    </HomepageShell>
  );
}
