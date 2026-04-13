'use client';

import { EducationItem } from '@/entities/education';
import type { PublicEducation } from '@/entities/education/model/types';

export function EducationSection({
  educations,
}: {
  educations: PublicEducation[];
}) {
  return (
    <section className="space-y-8">
      {educations.map((edu) => (
        <EducationItem key={edu.id} edu={edu} />
      ))}
    </section>
  );
}
