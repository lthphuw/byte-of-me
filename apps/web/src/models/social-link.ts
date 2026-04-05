import { Base } from '@/models/base';

export interface SocialLink extends Base {
  platform: string;
  url: string;
  sortOrder: number;
  userId: string;
}
