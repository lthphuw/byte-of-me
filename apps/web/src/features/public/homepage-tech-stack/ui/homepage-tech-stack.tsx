import { getTranslations } from 'next-intl/server';

import { getAllPublicTechStacks } from '@/entities/tech-stack';
import { TechStackBadge } from '@/entities/tech-stack/ui/tech-stack-badge';
import { ContentFade, SectionLoadError } from '@/shared/ui';

export async function HomepageTechStack() {
  const t = await getTranslations('homepage');
  const tError = await getTranslations('components.sectionLoadError');
  const resp = await getAllPublicTechStacks();

  const techStacks = resp.success ? resp.data?.techStacks ?? [] : [];
  // A failed read is not empty, so it keeps the heading and shows the error.
  if (resp.success && techStacks.length === 0) return null;

  return (
    <ContentFade>
      <section id="stack" className="space-y-6 md:space-y-8">
        <h2 className="text-xl font-semibold md:text-3xl">
          {t('skillsTitle')}
        </h2>

        {resp.success ? (
          <ul className="flex flex-wrap gap-2">
            {techStacks.map((tech) => (
              <li key={tech.id}>
                <TechStackBadge tech={tech} />
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
