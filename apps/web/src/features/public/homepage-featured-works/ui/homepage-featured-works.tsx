import { getTranslations } from 'next-intl/server';

import { getPublicFeaturedWorks } from '@/entities/featured-work/api/get-public-featured-works';
import { FeaturedWorkRow } from '@/entities/featured-work/ui/featured-work-row';
import { ContentFade } from '@/shared/ui';

export async function HomepageFeaturedWorks() {
  const t = await getTranslations('homepage');
  const resp = await getPublicFeaturedWorks();

  const works = resp.success ? resp.data.works : [];
  // No empty state: a section that says "nothing here" is worse than no section.
  if (works.length === 0) return null;

  return (
    <ContentFade>
      <section id="featured-works" className="space-y-6 md:space-y-8">
        <h2 className="text-xl font-semibold md:text-3xl">
          {t('featuredWorksTitle')}
        </h2>

        <ul className="divide-y rounded-xl border bg-card px-4 md:px-6">
          {works.map((work, index) => (
            <li key={work.id}>
              <FeaturedWorkRow work={work} index={index} />
            </li>
          ))}
        </ul>
      </section>
    </ContentFade>
  );
}
