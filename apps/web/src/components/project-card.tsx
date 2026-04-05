'use client';

import { Link } from '@/i18n/navigation';
import { Project } from '@/models/project';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { TagBadge } from '@/components/tag-badge';
import { TechStackBadge } from '@/components/tech-stack-badge';

import { Icons } from './icons';

interface ProjectCardProps {
  project: Project;
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
            <TechStackBadge key={tech.id} tech={tech} onClick={onTechClick} />
          ))}
        </div>
        }

        {/* TAGS */}
        {
          !compact &&
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} onClick={onTagClick} />
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
