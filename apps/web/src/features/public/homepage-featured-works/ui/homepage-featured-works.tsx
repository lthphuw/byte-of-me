import { ContentFade } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getPublicFeaturedWorks } from '@/entities/featured-work/api/get-public-featured-works';
import { FeaturedWorkRow } from '@/entities/featured-work/ui/featured-work-row';
import { SectionLoadError } from '@/shared/ui';

export async function HomepageFeaturedWorks() {
  const t = await getTranslations('homepage');
  const tError = await getTranslations('components.sectionLoadError');
  const resp = await getPublicFeaturedWorks();

  const works = resp.success ? resp.data.works : [];
  // No empty state: a section that says "nothing here" is worse than no section.
  // A failed read is not empty, so it keeps the heading and shows the error.
  if (resp.success && works.length === 0) return null;

  return (
    <ContentFade>
      <section id="featured-works" className="space-y-6 md:space-y-8">
        <h2 className="text-xl font-semibold md:text-3xl">
          {t('featuredWorksTitle')}
        </h2>

        {resp.success ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card px-4 md:px-5">
            {works.map((work) => (
              <li key={work.id}>
                <FeaturedWorkRow work={work} />
              </li>
            ))}
          </ul>
        ) : (
          <SectionLoadError
            title={tError('title')}
            description={tError('description')}
          />
        )}
      </section>
    </ContentFade>
  );
}
