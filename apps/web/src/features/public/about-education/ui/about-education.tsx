import { getAllPublicEducations } from '@/entities/education';
import { EducationSection } from '@/features/public/about-education/ui/education-section';

import { getTranslations } from 'next-intl/server';

export async function AboutEducation() {
  const t = await getTranslations();
  const educationsResp = await getAllPublicEducations();
  if (!educationsResp.success) {
    return null;
  }

  const educations = educationsResp.data?.educations || [];
  return (
    <section className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
          {t('about.section.education')}
        </h2>
      </div>
      <div className="pl-0">
        <EducationSection educations={educations} />
      </div>
    </section>
  );
}
