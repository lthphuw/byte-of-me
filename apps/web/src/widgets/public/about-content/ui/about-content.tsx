import { Suspense } from 'react';

import { AboutMe, AboutMeLoading } from '@/entities/user-profile';
import { AboutEducation, AboutEducationLoading } from '@/features/public';
import {
  AboutTechStack,
  AboutTechStackLoading,
} from '@/features/public/about-tech-stack/ui';
import { AboutSectionMotion } from '@/widgets/public/about-content/ui/about-section-motion';
import { AboutShell } from '@/widgets/public/about-content/ui/about-shell';

export function AboutContent() {
  return (
    <AboutShell>
      <div className="space-y-16 md:space-y-24">
          <AboutSectionMotion>
            <Suspense fallback={<AboutMeLoading />}>
              <AboutMe />
            </Suspense>
          </AboutSectionMotion>

          <AboutSectionMotion>
            <Suspense fallback={<AboutEducationLoading />}>
              <AboutEducation />
            </Suspense>
          </AboutSectionMotion>

          <AboutSectionMotion>
            <Suspense fallback={<AboutTechStackLoading />}>
              <AboutTechStack />
            </Suspense>
          </AboutSectionMotion>
      </div>
    </AboutShell>
  );
}
