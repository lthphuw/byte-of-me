'use client';

import { useMemo } from 'react';
import { Badge , Card, CardContent, CardHeader, CardTitle , DeleteButton , EditButton , Icons, richTextToPlainText } from '@byte-of-me/ui';
import { ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

import type { AdminProject } from '@/entities/project/model';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';

/**
 * UI strings the card needs. Passed in rather than read here: this is an
 * entity, and the copy belongs to the dashboard namespace that renders it.
 */
export interface ProjectEditorCardLabels {
  noDescription: string;
  edit: string;
  delete: string;
  githubLink: string;
  liveLink: string;
}

interface ProjectEditorCardProps {
  project: AdminProject;
  labels: ProjectEditorCardLabels;
  onEdit: (project: AdminProject) => void;
  onDelete: (id: string) => void;
  isPending?: boolean;
}

export function ProjectEditorCard({
  project,
  labels,
  onEdit,
  onDelete,
  isPending,
}: ProjectEditorCardProps) {
  const locale = useLocale();
  // Admin reads keep every locale, so the first row is whichever language
  // sorts first — resolve against the dashboard's own locale instead.
  const translation = getTranslatedContent(project.translations, locale);
  const title = translation?.title || project.slug;

  // Walks the whole Tiptap document, and this card re-renders whenever the
  // list does — including for an unrelated row's delete.
  const description = useMemo(
    () => richTextToPlainText(translation?.description) || labels.noDescription,
    [translation?.description, labels.noDescription]
  );

  return (
    <Card className="group relative flex flex-col justify-between border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      <CardHeader className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <Badge
            variant="secondary"
            className="font-mono text-[10px] font-medium tracking-tight"
          >
            {project.slug}
          </Badge>

          <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {/* Only the delete is in flight — disabling Edit as well left the
                row with no way back out of a slow delete. */}
            <EditButton label={labels.edit} onClick={() => onEdit(project)} />
            <DeleteButton
              label={labels.delete}
              isSubmitting={isPending}
              onClick={() => onDelete(project.id)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight">
            {title}
          </CardTitle>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {/* Descriptions are stored as Tiptap JSON; the clamped card wants
                the text-only reading, not the raw document. */}
            {description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex items-center gap-3 p-5 pt-0">
        {project.githubLink && (
          <a
            href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.githubLink}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icons.github size={16} className="h-4 w-4" />
          </a>
        )}
        {project.liveLink && (
          <a
            href={project.liveLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.liveLink}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
