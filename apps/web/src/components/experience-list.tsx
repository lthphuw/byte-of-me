'use client';

import ExperienceItem, { ExperienceItemProps } from './experience-item';

interface ExperienceListProps {
  experiences: ExperienceItemProps[];
}

export default function ExperienceList({ experiences }: ExperienceListProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-8 text-center text-3xl font-bold">Experience</h2>
      {experiences.map((exp, idx) => (
        <ExperienceItem key={idx} {...exp} />
      ))}
    </section>
  );
}
