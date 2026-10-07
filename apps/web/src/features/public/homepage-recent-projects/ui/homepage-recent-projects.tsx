import { Button } from '@byte-of-me/ui';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getPublicRecentProjects,ProjectEmpty } from '@/entities/project';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { Routes } from '@/shared/config/global';

export async function HomepageRecentProjects() {
  const t = await getTranslations('homepage');
  const resp = await getPublicRecentProjects();

  const recentProjects = resp.data?.recentProjects || [];
  const hasProjects = recentProjects.length > 0;

  return (
    <section id="projects" className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:gap-8">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold md:text-3xl">
            {t('selectedProjects')}
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            {t('aFewThingsIveBuiltRecently')}
          </p>
        </div>

        {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
            which is invalid and costs two tab stops. */}
        <Button
          variant="link"
          className="h-auto self-start p-0 text-sm md:text-base"
          asChild
        >
          <Link href={Routes.Projects}>{t('viewAllProjects')}</Link>
        </Button>
      </div>

      {/* Content */}
      {!hasProjects ? (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          <div className="col-span-full py-10">
            <ProjectEmpty />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          {recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
