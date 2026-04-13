'use client';

import type { PublicProject } from '@/entities/project/model/types';
import { TagClickableBadge } from '@/entities/tag/ui/tag-clickable-badge';
import { TechStackClickableBadge } from '@/entities/tech-stack/ui/tech-stack-clickable-badge';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';
import { Icons } from '@/shared/ui/icons';

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
  return (
    <Card className="flex h-full flex-col rounded-2xl">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* TITLE */}
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-1 text-lg font-semibold">
            {project.title}
          </h3>

          <p className="text-muted-foreground text-xs">
            {project.startDate ? new Date(project.startDate).getFullYear() : ''}
            {project.endDate
              ? ` - ${new Date(project.endDate).getFullYear()}`
              : ''}
          </p>
        </div>

        {/* DESCRIPTION */}
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {project.description}
        </p>

        {!compact && (
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

        {/* TAGS */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <TagClickableBadge key={tag.id} tag={tag} onClick={onTagClick} />
            ))}
          </div>
        )}
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="flex justify-end gap-2 p-5 pt-0">
        {project.githubLink && (
          <Button size="sm" variant="outline" asChild>
            <Link href={project.githubLink} target="_blank">
              <Icons.github size={20} /> GitHub
            </Link>
          </Button>
        )}

        {project.liveLink && (
          <Button size="sm" asChild>
            <Link href={project.liveLink} target="_blank">
              <Icons.externalLink /> Live
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
