import React, { FC } from 'react';
import { Link } from '@/i18n/navigation';
import { Prisma } from '@repo/db/generated/prisma/client';
import { HTMLMotionProps, motion } from 'framer-motion';

import { projectItemVariants } from '@/config/anim';
import { Routes } from '@/config/global';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyProject } from '@/components/empty-project';
import { RichText } from '@/components/rich-text';

import { Icons } from './icons';
import Loading from './loading';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export type ProjectProps = Prisma.ProjectGetPayload<{
  include: {
    tags: { include: { tag: true } };
    techstacks: { include: { techstack: true } };
    coauthors: { include: { coauthor: true } };
    blogs: true;
  };
}>;

interface ProjectItemProps extends HTMLMotionProps<'div'> {
  index?: number;
  project: ProjectProps;
  onViewDetails?: (project: ProjectProps) => void;
}

interface ProjectListProps {
  projects: ProjectProps[];
  isLoading?: boolean;
}

const LoadingState: FC = () => (
  <div className="flex items-center gap-2 justify-center">
    <Loading />
  </div>
);

const MAX_BADGES = 2;

export const ProjectItem: FC<ProjectItemProps> = React.memo(
  ({ index, project, ...motionProps }) => {
    const t = useTranslations('project');
    const visibleTechstacks = project.techstacks.slice(0, MAX_BADGES);
    const remainingTechstacks = project.techstacks.length - MAX_BADGES;
    const visibleTags = project.tags.slice(0, MAX_BADGES);
    const remainingTags = project.tags.length - MAX_BADGES;

    return (
      <motion.div
        custom={index}
        key={project.id}
        className="w-full h-full flex items-stretch"
        initial="hidden"
        animate="visible"
        exit=" exit"
        variants={projectItemVariants}
        {...motionProps}
      >
        <div className="container-bg min-w-[160px] rounded-2xl border-none p-1 text-sm shadow-md dark:shadow-[0_4px_10px_rgba(255,255,255,0.05)]">
          <div className="flex h-full flex-col items-stretch gap-3 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold line-clamp-2 mb-2">
              {project.title}
            </h2>

            {/* Tech Stacks */}
            <div className="flex gap-2 flex-wrap items-center">
              {visibleTechstacks.map((tech, index) => (
                <Link key={index} href={`${Routes.Projects}?techstack=${tech.techstack.slug}`}>
                  <Badge>{tech.techstack.name}</Badge>
                </Link>
              ))}

              {remainingTechstacks > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                        variant="outline"
                      >
                        +{remainingTechstacks}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {project.techstacks.slice(MAX_BADGES).map((tech) => (
                        <span key={tech.techstack.id} className="block">
                          {tech.techstack.name}
                        </span>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Tags */}
            <div className="flex gap-2 flex-wrap items-center">
              {visibleTags.map((tag, index) => (
                <Link key={index} href={`${Routes.Projects}?tag=${tag.tag.slug}`}>
                  <Badge variant={'outline'}>{tag.tag.name}</Badge>
                </Link>
              ))}

              {remainingTags > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                        variant="outline"
                      >
                        +{remainingTags}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {project.tags.slice(MAX_BADGES).map((tag) => (
                        <span key={tag.tag.id} className="block">
                          {tag.tag.name}
                        </span>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <RichText className="text-sm line-clamp-3" html={project.description || 'No description'} />

            {/*<p className="text-sm line-clamp-3">*/}
            {/*  {project.description || 'No description'}*/}
            {/*</p>*/}

            {project.liveLink && (
              <div>
                <span className="font-medium">Live: </span>
                <Link
                  href={project.liveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {project.liveLink}
                </Link>
              </div>
            )}

            {Array.isArray(project.coauthors) &&
              project.coauthors.length > 0 && (
                <div className="flex flex-row flex-wrap gap-2">
                  <span className="font-medium">
                    {`Co-author${project.coauthors.length > 1 ? 's' : ''}:`}
                  </span>
                  {project.coauthors.map((it, index) => (
                    <React.Fragment key={it.coauthor.email}>
                      <a
                        href={`mailto:${it.coauthor.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {it.coauthor.fullname}
                      </a>
                      {index < project.coauthors.length - 1 && <span>,</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

            <div className="w-full space-y-2 text-sm mt-auto md:self-end">
              <div className="mt-2 flex flex-col items-stretch gap-4 md:flex-row md:flex-nowrap">
                <Link
                  href={`${Routes.Projects}/${project.slug}`}
                  className={cn('w-full md:w-1/2', project.blogs?.length && project.slug ? '' : 'pointer-events-none opacity-75')}
                >
                  <Button className="w-full gap-2 py-3 text-lg md:py-2 md:text-base">
                    <Icons.article />
                    <span className="line-clamp-1">{t('details')}</span>
                  </Button>
                </Link>

                <Link
                  href={project.githubLink ?? '#'}
                  target="_blank"
                  className={cn('w-full md:w-1/2', project.githubLink ? '' : 'pointer-events-none opacity-75')}
                >
                  <Button
                    variant="secondary"
                    className={cn(
                      'w-full gap-2 py-3 text-lg md:py-2 md:text-base'
                    )}
                  >
                    <Icons.github />
                    <span>{t('gitHub')}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

export const ProjectList: FC<ProjectListProps> = ({ isLoading, projects }) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    return <EmptyProject />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectItem index={index} project={project} key={project.id} />
      ))}
    </div>
  );
};
