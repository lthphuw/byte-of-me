import { Media } from '@/entities/media/model/types';

export interface PublicTask {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  sortOrder: number;
  content: string;
}

export interface PublicRole {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  title: Maybe<string>;
  description: Maybe<string>;
  tasks: PublicTask[];
}

export interface PublicCompany {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  company: string;
  location: string;
  description: Maybe<string>;

  startDate: Date;
  endDate: Maybe<Date>;

  logo: Maybe<Media>;
  roles: PublicRole[];
}
