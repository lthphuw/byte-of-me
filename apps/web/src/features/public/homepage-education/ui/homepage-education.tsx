import { ContentFade } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getAllPublicEducations } from '@/entities/education';
import { EducationItem } from '@/entities/education/ui/education-item';
import { SectionLoadError } from '@/shared/ui';
import { ViewSwitch, ViewSwitchRoot } from '@/shared/ui/view-switch';

// Enough to show what the work was without turning the homepage into a CV; the
// rest are one click away.
const VISIBLE_ACHIEVEMENTS = 3;

export async function HomepageEducation() {
  const t = await getTranslations('homepage');
  const tError = await getTranslations('components.sectionLoadError');
  const resp = await getAllPublicEducations();

  const educations = resp.success ? resp.data?.educations ?? [] : [];
  // A failed read is not empty, so it keeps the heading and shows the error.
  if (resp.success && educations.length === 0) return null;

  const heading = (
    <h2 className="text-xl font-semibold md:text-3xl">{t('educationTitle')}</h2>
  );

  if (!resp.success) {
    return (
      <ContentFade>
        <section id="education" className="space-y-5 md:space-y-8">
          {heading}
          <SectionLoadError
            title={tError('title')}
            description={tError('description')}
          />
        </section>
      </ContentFade>
    );
  }

  // The switch is only worth showing when some school has more to open than its header.
  const expandable = educations.some(
    (edu) => edu.description || edu.achievements.length > 0
  );

  return (
    <ContentFade>
      <ViewSwitchRoot id="education" className="space-y-5 md:space-y-8">
        <div className="flex items-center justify-between gap-4">
          {heading}
          {expandable && (
            <ViewSwitch
              labels={{
                group: t('educationViewLabel'),
                compact: t('viewCompact'),
                details: t('viewDetails'),
              }}
            />
          )}
        </div>

        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {educations.map((edu, index) => (
            <li key={edu.id}>
              <EducationItem
                edu={edu}
                index={index}
                visibleAchievements={VISIBLE_ACHIEVEMENTS}
                labels={{
                  present: t('present'),
                  ongoing: t('ongoing'),
                  achievementCount: (count) => t('achievementCount', { count }),
                  moreAchievements: (count) => t('moreAchievements', { count }),
                  showLess: t('showLess'),
                }}
              />
            </li>
          ))}
        </ul>
      </ViewSwitchRoot>
    </ContentFade>
  );
}
