'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { PublicProject } from '@/entities/project/model/types';
import { ProjectTimelineItem } from '@/entities/project/ui/project-timeline-item';
import { RevealItem } from '@/shared/ui';

interface ProjectsTimelineProps {
  projects: PublicProject[];
  onTagClick?: (slug: string) => void;
  onTechClick?: (slug: string) => void;
}

/** Start year, or null when the project has no start date. */
type YearGroup = [year: number | null, projects: PublicProject[]];

function groupByStartYear(projects: PublicProject[]): YearGroup[] {
  const groups = new Map<number | null, PublicProject[]>();

  for (const project of projects) {
    const year = project.startDate
      ? new Date(project.startDate).getFullYear()
      : null;

    const existing = groups.get(year);
    if (existing) {
      existing.push(project);
    } else {
      groups.set(year, [project]);
    }
  }

  // Newest year first; undated projects sink to the bottom rather than
  // interrupting the chronology.
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });
}

export function ProjectsTimeline({
  projects,
  onTagClick,
  onTechClick,
}: ProjectsTimelineProps) {
  const t = useTranslations('project');
  const groups = useMemo(() => groupByStartYear(projects), [projects]);

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      {groups.map(([year, items]) => (
        <section key={year ?? 'undated'}>
          <div className="mb-4 flex items-center gap-4 md:mb-6">
            {/* Spelled out rather than `meta-label` + `text-sm`: both set a
                font size, and which one wins depends on CSS emission order
                rather than the order they appear in here. */}
            <h2 className="text-sm font-medium tabular-nums tracking-[0.08em] text-muted-foreground">
              {year ?? t('undated')}
            </h2>
            <span aria-hidden className="h-px flex-1 bg-border/60" />
          </div>

          {/* The spine. Items sit on its right edge and place their own marker
              on it, so the line and the markers never drift apart. */}
          <ol className="border-l border-border/60">
            {items.map((project, index) => (
              <RevealItem
                key={project.id}
                as="li"
                index={index}
                className="relative pb-8 pl-8 last:pb-0 md:pb-12"
              >
                <ProjectTimelineItem
                  project={project}
                  onTagClick={onTagClick}
                  onTechClick={onTechClick}
                />
              </RevealItem>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
