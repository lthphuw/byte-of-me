'use client';

import { Code, ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

import type { PublicProject } from '@/entities/project/model/types';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { TechStackClickableBadge } from '@/entities/tech-stack/ui/tech-stack-clickable-badge';
import { Link } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/lib/utils';
import { Button , Card, CardContent } from '@/shared/ui';





export interface ProjectCardProps {
  project: PublicProject;
  compact?: boolean;
  onTagClick?: (slug: string) => void;
  onTechClick?: (slug: string) => void;
}

export function ProjectCard({
  compact,
  project,
  onTagClick,
  onTechClick,
}: ProjectCardProps) {
  const locale = useLocale();
  const start = formatDate(project.startDate, locale);
  const end = project.endDate ? formatDate(project.endDate) : 'Present';

  return (
    <Card className="flex h-full flex-col rounded-xl border-border/40 bg-card transition-colors hover:border-border/80">
      <CardContent className="flex flex-1 flex-col p-5">
        {/* HEADER */}
        <div className="mb-3 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="line-clamp-1 text-lg font-bold tracking-tight">
              {project.title}
            </h3>

            {/*{!project.endDate && (*/}
            {/*  <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">*/}
            {/*    Active*/}
            {/*  </span>*/}
            {/*)}*/}
          </div>

          <time className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {start ? `${start} — ${end}` : 'Ongoing'}
          </time>
        </div>

        {/* DESCRIPTION */}
        <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-muted-foreground md:line-clamp-3">
          {project.description}
        </p>

        {/* METADATA */}
        {!compact && (
          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {project.techStacks.map((tech) => (
                <TechStackClickableBadge
                  key={tech.id}
                  tech={tech}
                  onClick={onTechClick}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <TagClickableBadge
                  key={tag.id}
                  tag={tag}
                  onClick={onTagClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="mt-5 flex items-center gap-2 border-t pt-5">
          {project.liveLink && (
            <Button
              size="sm"
              asChild
              className="h-8 flex-1 rounded-lg text-xs font-semibold"
            >
              <Link href={project.liveLink} target="_blank">
                <ExternalLink className="mr-2" size={14} />
                Live Demo
              </Link>
            </Button>
          )}

          {project.githubLink && (
            <Button
              size="sm"
              variant="secondary"
              asChild
              className={
                project.liveLink
                  ? 'h-8 w-8 rounded-lg p-0'
                  : 'h-8 flex-1 rounded-lg text-xs font-semibold'
              }
            >
              <Link href={project.githubLink} target="_blank">
                <Code size={16} />
                {!project.liveLink && <span className="ml-2">GitHub</span>}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
