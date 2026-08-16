'use client';

import { Button, Card, CardContent } from '@byte-of-me/ui';
import { Code, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { PublicProject } from '@/entities/project/model/types';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { TechStackClickableBadge } from '@/entities/tech-stack/ui/tech-stack-clickable-badge';
import { Link } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/lib/utils';

export interface ProjectCardProps {
  project: PublicProject;
  compact?: boolean;
  onTagClick?: (slug: string) => void;
  onTechClick?: (slug: string) => void;
}

/**
 * Card form of a project, used where projects appear alongside other content —
 * currently the homepage. The projects list page uses `ProjectTimelineItem`
 * instead, which has room for the full date range and both action buttons.
 */
export function ProjectCard({
  compact,
  project,
  onTagClick,
  onTechClick,
}: ProjectCardProps) {
  const locale = useLocale();
  const t = useTranslations('project');

  const start = formatDate(project.startDate, locale);
  // The locale was missing here, so end dates rendered in English while start
  // dates followed the active locale.
  const end = project.endDate
    ? formatDate(project.endDate, locale)
    : t('present');

  return (
    <Card className="group flex h-full flex-col rounded-2xl border-border/60 bg-card transition-all duration-300 hover:border-border hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-4 p-5 md:gap-6">
        <div className="space-y-2">
          <h3 className="line-clamp-1 font-heading text-lg tracking-tight">
            {project.title}
          </h3>
          <time className="block tabular-nums meta-label">
            {start ? `${start} — ${end}` : end}
          </time>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground md:line-clamp-3">
          {project.description}
        </p>

        {!compact && (
          <div className="mt-auto space-y-2 pt-2">
            <div className="flex flex-wrap gap-2">
              {project.techStacks.map((tech) => (
                <TechStackClickableBadge
                  key={tech.id}
                  tech={tech}
                  onClick={onTechClick}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
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

        <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
          {project.liveLink && (
            <Button
              size="sm"
              asChild
              className="h-8 flex-1 rounded-lg text-xs font-semibold"
            >
              <Link href={project.liveLink} target="_blank">
                <ExternalLink className="mr-2" size={14} />
                {t('liveDemo')}
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
                {project.liveLink ? (
                  <span className="sr-only">{t('gitHub')}</span>
                ) : (
                  <span className="ml-2">{t('gitHub')}</span>
                )}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
