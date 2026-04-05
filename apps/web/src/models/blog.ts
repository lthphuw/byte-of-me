import { Base } from '@/models/base';
import { Media } from '@/models/media';
import { Project } from '@/models/project';
import { Tag } from '@/models/tag';

export interface Blog extends Base {
  slug: string;
  publishedDate?: Maybe<Date>;
  isPublished: boolean;

  title: string;
  description?: Maybe<string>;
  content: string;

  readingTime?: Maybe<number>;

  project?: Maybe<Project>;
  coverImage?: Maybe<Media>;
  tags: Tag[];
}
