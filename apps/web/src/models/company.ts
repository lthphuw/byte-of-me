import { Base } from '@/models/base';
import { Media } from '@/models/media';
import { Role } from '@/models/role';

export interface Company extends Base {
  company: string;
  location: string;
  description: Maybe<string>;

  startDate: Date;
  endDate: Maybe<Date>;

  logo: Maybe<Media>;
  roles: Role[];
}
