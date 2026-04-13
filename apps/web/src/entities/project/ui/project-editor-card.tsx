'use client';

import type { AdminProject } from '@/entities/project/model';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Icons } from '@/shared/ui/icons';

import { Edit2, ExternalLink, Trash2 } from 'lucide-react';

interface ProjectEditorCardProps {
  project: AdminProject;
  onEdit: (project: any) => void;
  onDelete: (id: string) => void;
}

export function ProjectEditorCard({
  project,
  onEdit,
  onDelete,
}: ProjectEditorCardProps) {
  const t = project.translations?.[0] || {
    title: project.slug,
    description: 'No description available.',
  };

  return (
    <Card className="border-border/50 bg-card hover:border-border group relative flex flex-col justify-between transition-all hover:shadow-sm">
      <CardHeader className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <Badge
            variant="secondary"
            className="font-mono text-[10px] font-medium tracking-tight"
          >
            {project.slug}
          </Badge>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              onClick={() => onEdit(project)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight">
            {t.title}
          </CardTitle>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
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
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icons.github size={16} className="h-4 w-4" />
          </a>
        )}
        {project.liveLink && (
          <a
            href={project.liveLink}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
