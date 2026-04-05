import { Base } from '@/models/base';
import { Media } from '@/models/media';


export interface EducationAchievement extends Base {
  sortOrder: number;
  title: string;
  content: Maybe<string>;
  images: Media[];
}

export interface Education extends Base {
  title: string;
  description: Maybe<string>;
  startDate: Date;
  endDate: Maybe<Date>;
  logo: Maybe<Media>;
  achievements: EducationAchievement[];
}
