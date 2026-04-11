import Link from 'next/link';
import { ProjectEmpty, getPublicRecentProjects } from '@/entities/project';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { Routes } from '@/shared/config/global';
import { Button } from '@/shared/ui/button';
import { getTranslations } from 'next-intl/server';

export async function HomepageRecentProjects() {
  const t = await getTranslations('homepage');
  const resp = await getPublicRecentProjects();

  const recentProjects = resp.data?.recentProjects || [];
  const hasProjects = recentProjects.length > 0;

  return (
    <section id="projects" className="space-y-8 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-xl md:text-3xl font-semibold">
            {t('selectedProjects')}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t('aFewThingsIveBuiltRecently')}
          </p>
        </div>

        <Link href={Routes.Projects}>
          <Button variant="link" className="p-0 text-sm md:text-base h-auto">
            {t('viewAllProjects')}
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
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
