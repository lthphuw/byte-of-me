import { Suspense } from 'react';

import { AboutMe, AboutMeLoading } from '@/entities/user-profile';
import { AboutEducationLoading } from '@/features/public/about-education/ui';
import { AboutEducation } from '@/features/public/about-education/ui/about-education';
import {
  AboutTechStack,
  AboutTechStackLoading,
} from '@/features/public/about-tech-stack/ui';
import { AboutSectionMotion } from '@/widgets/public/about-content/ui/about-section-motion';
import { AboutShell } from '@/widgets/public/about-content/ui/about-shell';

export function AboutContent() {
  return (
    <AboutShell>
      <div className="flex justify-center px-0 py-8 md:px-8">
        <div className="w-full max-w-4xl space-y-20">
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
      </div>
    </AboutShell>
  );
}
