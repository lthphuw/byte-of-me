import { Suspense } from 'react';
import { HomepageContactCta } from '@/features/public/homepage-cta';
import {
  HomepageProfile,
  HomepageProfileLoading,
} from '@/features/public/homepage-profile';
import {
  HomepageRecentProjects,
  HomepageRecentProjectsLoading,
} from '@/features/public/homepage-recent-projects';

import { HomepageSectionMotion } from './homepage-section-motion';
import { HomepageShell } from './homepage-shell';

export async function HomepageContent() {
  return (
    <HomepageShell>
      <main
        id="home"
        className="mx-auto max-w-6xl px-0 md:px-8 py-14 md:py-20 space-y-16 md:space-y-28"
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
