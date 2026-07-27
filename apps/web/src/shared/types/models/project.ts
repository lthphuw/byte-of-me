import type { Tag } from '@/shared/types/models/tag';
import type { TechStack } from '@/shared/types/models/tech-stack';


export interface ProjectCoauthor {
  id: string;
  fullName: string;
  email: Maybe<string>;
}

export interface Project {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  slug: string;
  githubLink: Maybe<string>;
  liveLink: Maybe<string>;
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  isPublished: Maybe<boolean>;
  title: Maybe<string>;
  /** Plain-text reading of the description, for `line-clamp` excerpts. */
  description: Maybe<string>;
  /**
   * Sanitized HTML rendered from the stored rich text. Only populated where a
   * consumer displays the full description (the projects timeline).
   */
  descriptionHtml?: string;

  tags: Tag[];
  techStacks: TechStack[];

  /** Only populated on the project detail payload (getPublicProjectById). */
  coauthors?: ProjectCoauthor[];
}
