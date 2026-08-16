// Deliberately a server component. It only maps data to markup, and it is the
// boundary that keeps `EducationItem` → `RichText` → the Tiptap extension
// schema on the server. A `'use client'` here once turned that whole subtree
// into client code and shipped the full editor (~380 KB) to the About page.
import { EducationItem } from '@/entities/education';
import type { PublicEducation } from '@/entities/education/model/types';

export function EducationSection({
  educations,
}: {
  educations: PublicEducation[];
}) {
  return (
    <section className="space-y-8 md:space-y-12">
      {educations.map((edu) => (
        <EducationItem key={edu.id} edu={edu} />
      ))}
    </section>
  );
}
