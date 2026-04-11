'use client';

import { PublicProject } from '@/entities/project/model/types';
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
    <Card className="rounded-2xl flex flex-col h-full">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* TITLE */}
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold line-clamp-1">
            {project.title}
          </h3>

          <p className="text-xs text-muted-foreground">
            {project.startDate ? new Date(project.startDate).getFullYear() : ''}
            {project.endDate
              ? ` - ${new Date(project.endDate).getFullYear()}`
              : ''}
          </p>

        </div>

        {/* DESCRIPTION */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {project.description}
        </p>

        {
          !compact &&
        <div className="flex flex-wrap gap-1.5">
          {project.techStacks.map((tech) => (
            <TechStackClickableBadge key={tech.id} tech={tech} onClick={onTechClick} />
          ))}
        </div>
        }

        {/* TAGS */}
        {
          !compact &&
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <TagClickableBadge key={tag.id} tag={tag} onClick={onTagClick} />
          ))}
        </div>
        }
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="p-5 pt-0 flex gap-2 justify-end">
        {project.githubLink && (
          <Button size="sm" variant="outline" asChild>
            <Link href={project.githubLink} target="_blank">
              <Icons.github size={20}/> GitHub
            </Link>
          </Button>
        )}

        {project.liveLink && (
          <Button size="sm" asChild>
            <Link href={project.liveLink} target="_blank">
              <Icons.externalLink/> Live
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
