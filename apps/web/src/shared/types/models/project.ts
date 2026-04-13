import type { Tag } from '@/shared/types/models/tag';
import type { TechStack } from '@/shared/types/models/tech-stack';


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
  description: Maybe<string>;

  tags: Tag[];
  techStacks: TechStack[];
}
