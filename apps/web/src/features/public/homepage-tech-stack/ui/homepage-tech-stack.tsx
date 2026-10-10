import { getTranslations } from 'next-intl/server';

import { getAllPublicTechStacks } from '@/entities/tech-stack';
import { TechStackBadge } from '@/entities/tech-stack/ui/tech-stack-badge';
import { ContentFade } from '@/shared/ui';

export async function HomepageTechStack() {
  const t = await getTranslations('homepage');
  const resp = await getAllPublicTechStacks();

  const techStacks = resp.success ? resp.data?.techStacks ?? [] : [];
  if (techStacks.length === 0) return null;

  return (
    <ContentFade>
      <section id="stack" className="space-y-6 md:space-y-8">
        <h2 className="text-xl font-semibold md:text-3xl">
          {t('skillsTitle')}
        </h2>

        <ul className="flex flex-wrap gap-2">
          {techStacks.map((tech) => (
            <li key={tech.id}>
              <TechStackBadge tech={tech} />
            </li>
          ))}
        </ul>
      </section>
    </ContentFade>
  );
}
