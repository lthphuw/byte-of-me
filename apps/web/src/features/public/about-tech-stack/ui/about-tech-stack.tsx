import { getAllPublicTechStacks } from '@/entities/tech-stack';
import { getTranslations } from 'next-intl/server';

import { TechStackSection } from './tech-stack-section';

export async function AboutTechStack() {
  const t = await getTranslations();
  const techStacksResp = await getAllPublicTechStacks();
  if (!techStacksResp.success) {
    return null;
  }

  const techStacks = techStacksResp.data?.techStacks || [];

  return (
    <section className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
          {t('about.section.skillsTechStack')}
        </h2>
      </div>
      <div className="pl-0">
        <TechStackSection techStacks={techStacks} />
      </div>
    </section>
  );
}
