'use client';

import { useMemo } from 'react';
import { getTranslatedContent } from '@byte-of-me/api-core';
import { richTextToPlainText } from '@byte-of-me/rich-text-schema/rich-text-content';
import { Badge, CardTitle, Icons } from '@byte-of-me/ui';
import { ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

import { adminProjectTitle } from '@/entities/project/model/admin-project-title';
import type { AdminProject } from '@/entities/project/model/types';
import { RecordListItem, RecordRowActions } from '@/shared/ui/record-list';

/**
 * UI strings the card needs. Passed in rather than read here: this is an
 * entity, and the copy belongs to the dashboard namespace that renders it.
 */
export interface ProjectEditorCardLabels {
  noDescription: string;
  githubLink: string;
  liveLink: string;
}

/** 44px on touch; under `can-hover:` the 16px icon keeps its desktop box. */
const LINK_CLASS =
  'flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground can-hover:min-h-0 can-hover:min-w-0';

interface ProjectEditorCardProps {
  project: AdminProject;
  labels: ProjectEditorCardLabels;
  onEdit: (project: AdminProject) => void;
  onDelete: () => void;
}

export function ProjectEditorCard({
  project,
  labels,
  onEdit,
  onDelete,
}: ProjectEditorCardProps) {
  // Admin reads return every locale in no fixed order, so resolve against the
  // dashboard's own locale rather than taking the first row.
  const locale = useLocale();
  const title = adminProjectTitle(project, locale);
  const translation = getTranslatedContent(project.translations, locale);

  // Walks the whole Tiptap document, and this card re-renders whenever the
  // list does — including for an unrelated row's delete.
  const description = useMemo(
    () => richTextToPlainText(translation?.description) || labels.noDescription,
    [translation?.description, labels.noDescription]
  );

  return (
    <RecordListItem
      className="items-start"
      actions={
        <RecordRowActions
          name={title}
          onEdit={() => onEdit(project)}
          onDelete={onDelete}
        />
      }
    >
      <div className="space-y-2">
        <Badge
          variant="secondary"
          className="font-mono text-[10px] font-medium tracking-tight"
        >
          {project.slug}
        </Badge>
        <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight">
          {title}
        </CardTitle>
        {/* Descriptions are stored as Tiptap JSON; the clamped card wants
            the text-only reading, not the raw document. */}
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {(project.githubLink || project.liveLink) && (
          <div className="flex items-center gap-3 pt-1">
            {project.githubLink && (
              <a
                href={project.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={labels.githubLink}
                className={LINK_CLASS}
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
                className={LINK_CLASS}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </RecordListItem>
  );
}
