import type { PublicMedia } from '@/shared/types/models';

export interface TechStack {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  slug: string;
  group: string;
  sortOrder: number;
  logo: Maybe<PublicMedia>;
}
