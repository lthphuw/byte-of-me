import React, { FC } from 'react';
import { Link } from '@/i18n/navigation';
import { HTMLMotionProps, Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { Icons } from './icons';
import Loading from './loading';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  article?: string | null;
  githubLink?: string | null;
  liveLink?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  techstacks: { name: string; id: string }[];
  coauthors: { fullname: string; email: string }[];
  tags: { name: string; id: string }[];
}

interface ProjectItemProps extends HTMLMotionProps<'div'> {
  index?: number;
  project: Project;
  onViewDetails?: (project: Project) => void;
}

interface ProjectListProps {
  projects: Project[];
  isLoading?: boolean;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring',
      stiffness: 130,
      damping: 10,
    },
  }),
  exit: { opacity: 0, y: 10 },
};

export const ProjectItem: FC<ProjectItemProps> = ({
  index,
  project,
  onViewDetails,
  ...motionProps
}) => {
  const t = useTranslations('project');

  return (
    <motion.div
      custom={index}
      key={project.id}
      className="w-full h-full flex items-stretch"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={itemVariants}
      {...motionProps}
    >
      <div className="container-bg min-w-[160px] rounded-2xl border-none p-1 text-sm shadow-md dark:shadow-[0_4px_10px_rgba(255,255,255,0.05)]">
        <div className="flex h-full flex-col items-stretch gap-3 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold line-clamp-3 mb-2">
            {project.title}
          </h2>

          <div className="flex gap-2 flex-wrap">
            {project.techstacks.map((tech, index) => (
              <Link key={index} href={'#'}>
                <Badge variant={'secondary'}>{tech.name}</Badge>
              </Link>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {project.tags.map((tag, index) => (
              <Link key={index} href={'#'}>
                <Badge variant={'outline'}>{tag.name}</Badge>
              </Link>
            ))}
          </div>

          <p className=" text-sm line-clamp-3">
            {project.description || 'Không có mô tả'}
          </p>

          {project.liveLink && (
            <div>
              <span className="font-medium">Live: </span>
              <a
                href={project.liveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {project.liveLink}
              </a>
            </div>
          )}

          {Array.isArray(project.coauthors) && project.coauthors.length > 0 && (
            <div className="flex flex-row flex-wrap gap-2">
              <span className="font-medium">
                {`Co-author${project.coauthors.length > 1 ? 's' : ''}:`}
              </span>
              {project.coauthors.map((it, index) => (
                <React.Fragment key={it.email}>
                  <a
                    href={`mailto:${it.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {it.fullname}
                  </a>
                  {index < project.coauthors.length - 1 && <span>,</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="w-full space-y-2 text-sm mt-auto md:self-end">
            <div className="mt-2 flex flex-col items-stretch gap-4 md:flex-row md:flex-nowrap">
              <Link
                href={project.article ?? `/projects/${project.id}`}
                className="w-full md:w-1/2"
              >
                <Button className="w-full gap-2 py-3 text-lg md:py-2 md:text-base">
                  <Icons.article />
                  <span className="line-clamp-1">{t('Details')}</span>
                </Button>
              </Link>
              <Link
                href={project.githubLink ?? '#'}
                className="w-full md:w-1/2"
              >
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full gap-2 py-3 text-lg md:py-2 md:text-base'
                  )}
                >
                  <Icons.github />
                  <span>{'GitHub'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectList: FC<ProjectListProps> = ({ isLoading, projects }) => {
  const t = useTranslations('project');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 justify-center">
        <Loading />
      </div>
    );
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    return (
      <div className="flex items-center gap-2 justify-center">
        <Icons.scanSearch width={32} height={32} />
        <span className="text-lg">{t('There are no projects yet')}.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectItem index={index} project={project} key={project.id} />
      ))}
    </div>
  );
};
