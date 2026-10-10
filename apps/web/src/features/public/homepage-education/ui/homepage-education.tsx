import { getTranslations } from 'next-intl/server';

import { getAllPublicEducations } from '@/entities/education';
import { EducationItem } from '@/entities/education/ui/education-item';

// Enough to show what the work was without turning the homepage into a CV; the
// rest are one click away.
const VISIBLE_ACHIEVEMENTS = 3;

export async function HomepageEducation() {
  const t = await getTranslations('homepage');
  const resp = await getAllPublicEducations();

  const educations = resp.success ? resp.data?.educations ?? [] : [];
  if (educations.length === 0) return null;

  return (
    <section id="education" className="space-y-6 md:space-y-8">
      <h2 className="text-xl font-semibold md:text-3xl">
        {t('educationTitle')}
      </h2>

      <ul className="space-y-4 md:space-y-6">
        {educations.map((edu) => (
          <li key={edu.id}>
            <EducationItem
              edu={edu}
              visibleAchievements={VISIBLE_ACHIEVEMENTS}
              labels={{
                present: t('present'),
                ongoing: t('ongoing'),
                moreAchievements: (count) => t('moreAchievements', { count }),
                showLess: t('showLess'),
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
