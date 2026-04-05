import { Base } from '@/models/base';
import { Media } from '@/models/media';


export interface TechStack extends Base {
  name: string;
  slug: string;
  group: string;
  sortOrder: number;
  logo: Maybe<Media>;
  userId: string;
}
