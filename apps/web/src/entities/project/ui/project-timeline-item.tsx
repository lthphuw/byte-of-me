'use client';

import { Button } from '@byte-of-me/ui';
// Subpath on purpose: the presentational half of RichText, with no tiptap in
// it. The HTML itself is rendered by the server action that feeds this list.
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { Code, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { PublicProject } from '@/entities/project/model/types';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { TechStackClickableBadge } from '@/entities/tech-stack/ui/tech-stack-clickable-badge';
import { Link } from '@/shared/i18n/navigation';
import { cn, formatDate } from '@/shared/lib/utils';
import { ExpandableRichText } from '@/shared/ui';

export interface ProjectTimelineItemProps {
  project: PublicProject;
  onTagClick?: (slug: string) => void;
  onTechClick?: (slug: string) => void;
}

/**
 * One entry on the projects timeline. Projects carry no cover image, so the
 * date range is the material this form is built around: entries hang off a
 * spine, and the marker is filled when the project is still running and hollow
 * when it has finished — the structure states something true about the work
 * rather than decorating it.
 *
 * Renders the entry's contents only; the owning `<li>`, its spacing and the
 * reveal animation belong to `ProjectsTimeline`. The marker is absolutely
 * positioned against that `<li>`.
 */
export function ProjectTimelineItem({
  project,
  onTagClick,
  onTechClick,
}: ProjectTimelineItemProps) {
  const locale = useLocale();
  const t = useTranslations('project');

  const isOngoing = !project.endDate;
  const start = formatDate(project.startDate, locale);
  const end = isOngoing ? t('present') : formatDate(project.endDate, locale);
  const dateRange = start ? `${start} — ${end}` : end;

  return (
    <>
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-2 size-2.5 -translate-x-1/2 rounded-full ring-4 ring-background',
          isOngoing ? 'bg-foreground' : 'border border-border bg-background'
        )}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <h3 className="font-heading text-xl tracking-tight">
            {project.title}
            <span className="sr-only">
              {' — '}
              {isOngoing ? t('ongoing') : t('completed')}
            </span>
          </h3>

          <time className="shrink-0 tabular-nums meta-label">{dateRange}</time>
        </div>

        {project.descriptionHtml && (
          <ExpandableRichText className="max-w-2xl">
            <RichTextHtml
              html={project.descriptionHtml}
              variant="compact"
              className="text-muted-foreground"
            />
          </ExpandableRichText>
        )}

        {project.techStacks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.techStacks.map((tech) => (
              <TechStackClickableBadge
                key={tech.id}
                tech={tech}
                onClick={onTechClick}
              />
            ))}
          </div>
        )}

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <TagClickableBadge key={tag.id} tag={tag} onClick={onTagClick} />
            ))}
          </div>
        )}

        {(project.liveLink || project.githubLink) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {project.liveLink && (
              <Button size="sm" asChild className="h-8 rounded-lg text-xs">
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
                className="h-8 rounded-lg text-xs"
              >
                <Link href={project.githubLink} target="_blank">
                  <Code className="mr-2" size={14} />
                  {t('gitHub')}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
