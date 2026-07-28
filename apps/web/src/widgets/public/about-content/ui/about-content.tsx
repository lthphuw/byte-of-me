import { Suspense } from 'react';

import { AboutMe, AboutMeLoading } from '@/entities/user-profile';
import { AboutEducation, AboutEducationLoading } from '@/features/public';
import {
  AboutTechStack,
  AboutTechStackLoading,
} from '@/features/public/about-tech-stack/ui';
import { RevealSection } from '@/shared/ui';
import { AboutShell } from '@/widgets/public/about-content/ui/about-shell';

export function AboutContent() {
  return (
    <AboutShell>
      <div className="space-y-16 md:space-y-24">
          <RevealSection>
            <Suspense fallback={<AboutMeLoading />}>
              <AboutMe />
            </Suspense>
          </RevealSection>

          <RevealSection>
            <Suspense fallback={<AboutEducationLoading />}>
              <AboutEducation />
            </Suspense>
          </RevealSection>

          <RevealSection>
            <Suspense fallback={<AboutTechStackLoading />}>
              <AboutTechStack />
            </Suspense>
          </RevealSection>
      </div>
    </AboutShell>
  );
}
