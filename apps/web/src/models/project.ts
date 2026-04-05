import { Base } from '@/models/base';
import { Tag } from '@/models/tag';
import { TechStack } from '@/models/tech-stack';

export interface Project extends Base {
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
