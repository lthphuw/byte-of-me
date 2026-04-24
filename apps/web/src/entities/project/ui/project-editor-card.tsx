'use client';

import { ExternalLink } from 'lucide-react';

import type { AdminProject } from '@/entities/project/model';
import { Badge , Card, CardContent, CardHeader, CardTitle , DeleteButton , EditButton , Icons } from '@/shared/ui';

interface ProjectEditorCardProps {
  project: AdminProject;
  onEdit: (project: Any) => void;
  onDelete: (id: string) => void;
  isPending?: boolean;
}

export function ProjectEditorCard({
  project,
  onEdit,
  onDelete,
  isPending,

}: ProjectEditorCardProps) {
  const t = project.translations?.[0] || {
    title: project.slug,
    description: 'No description available.',
  };

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

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <EditButton isSubmitting={isPending} onClick={() => onEdit(project)}/>
            <DeleteButton isSubmitting={isPending} onClick={() => onDelete(project.id)}/>
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight">
            {t.title}
          </CardTitle>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {t.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex items-center gap-3 p-5 pt-0">
        {project.githubLink && (
          <a
            href={project.githubLink}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icons.github size={16} className="h-4 w-4" />
          </a>
        )}
        {project.liveLink && (
          <a
            href={project.liveLink}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
