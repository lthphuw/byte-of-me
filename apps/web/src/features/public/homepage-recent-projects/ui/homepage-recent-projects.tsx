import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getPublicRecentProjects,ProjectEmpty } from '@/entities/project';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { Routes } from '@/shared/config/global';
import { Button } from '@/shared/ui/button';

export async function HomepageRecentProjects() {
  const t = await getTranslations('homepage');
  const resp = await getPublicRecentProjects();

  const recentProjects = resp.data?.recentProjects || [];
  const hasProjects = recentProjects.length > 0;

  return (
    <section id="projects" className="space-y-8 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-xl font-semibold md:text-3xl">
            {t('selectedProjects')}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            {t('aFewThingsIveBuiltRecently')}
          </p>
        </div>

        <Link href={Routes.Projects}>
          <Button variant="link" className="h-auto p-0 text-sm md:text-base">
            {t('viewAllProjects')}
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {!hasProjects ? (
          <div className="col-span-full py-10">
            <ProjectEmpty />
          </div>
        ) : (
          recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} compact />
          ))
        )}
      </div>
    </section>
  );
}
