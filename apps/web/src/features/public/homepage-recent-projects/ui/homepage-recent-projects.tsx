import { Button } from '@byte-of-me/ui';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getPublicRecentProjects,ProjectEmpty } from '@/entities/project';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { Routes } from '@/shared/config/global';
import { StaggerItem, StaggerList } from '@/shared/ui';

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
          <p className="text-xs text-muted-foreground md:text-sm">
            {t('aFewThingsIveBuiltRecently')}
          </p>
        </div>

        {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
            which is invalid and costs two tab stops. */}
        <Button
          variant="link"
          className="h-auto p-0 text-sm md:text-base"
          asChild
        >
          <Link href={Routes.Projects}>{t('viewAllProjects')}</Link>
        </Button>
      </div>

      {/* Content */}
      {!hasProjects ? (
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <div className="col-span-full py-10">
            <ProjectEmpty />
          </div>
        </div>
      ) : (
        <StaggerList className="grid gap-4 md:grid-cols-2 md:gap-6">
          {recentProjects.map((project) => (
            <StaggerItem key={project.id}>
              <ProjectCard project={project} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </section>
  );
}
