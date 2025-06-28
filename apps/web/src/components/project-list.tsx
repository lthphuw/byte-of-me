import { FC } from 'react';
import Link from 'next/link';
import { HTMLMotionProps, Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { Icons } from './icons';
import { Loading } from './loading';
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
  tags: { name: string; id: string }[];
}

interface ProjectItemProps extends HTMLMotionProps<'div'> {
  index?: number;
  project: Project;
  onViewDetails?: (project: Project) => void;
}

interface ProjectListProps {
  projects: Project[];
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
      <div
        className="glass-base min-w-[160px] rounded-2xl border-none p-1 text-sm shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)]"
      >
        <div className="flex h-full flex-col items-stretch gap-2 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-2">{project.title}</h2>
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
          <p className=" text-sm line-clamp-3 mb-4">
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
                View Live
              </a>
            </div>
          )}

          <div className="space-y-2 text-sm mt-auto md:self-end">
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:flex-nowrap">
              <Link href={project.article ?? '#'} className="w-full md:w-1/2">
                <Button className="w-full gap-2 py-3 text-lg md:py-2 md:text-base">
                  <Icons.article />
                  <span>{'Details'}</span>
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

export const ProjectList: FC<ProjectListProps> = ({ projects }) => {
  const t = useTranslations('project');

  return !Array.isArray(projects) ? (
    <div className="flex items-center gap-2 justify-center">
      <Loading />
      <span>{t('Loading project list')}...</span>
    </div>
  ) : projects.length === 0 ? (
    <div className="flex items-center gap-2 justify-center">
      <Icons.scanSearch width={32} height={32} />
      <span className="text-lg">{t('There are no projects yet')}.</span>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectItem index={index} project={project} key={project.id} />
      ))}
    </div>
  );
};
