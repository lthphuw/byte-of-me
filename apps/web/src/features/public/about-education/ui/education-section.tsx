// Deliberately a server component. It only maps data to markup, and it is the
// boundary that keeps `EducationItem` → `RichText` → the Tiptap extension
// schema on the server. A `'use client'` here once turned that whole subtree
// into client code and shipped the full editor (~380 KB) to the About page.
import { getTranslations } from 'next-intl/server';

import { EducationItem } from '@/entities/education';
import type { PublicEducation } from '@/entities/education/model/types';

export async function EducationSection({
  educations,
}: {
  educations: PublicEducation[];
}) {
  const t = await getTranslations('about.education');

  return (
    <section className="space-y-8 md:space-y-12">
      {educations.map((edu) => (
        <EducationItem
          key={edu.id}
          edu={edu}
          labels={{ present: t('present'), ongoing: t('ongoing') }}
        />
      ))}
    </section>
  );
}
