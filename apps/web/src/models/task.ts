import { Base } from '@/models/base';

export interface Task extends Base {
  sortOrder: number;
  content: string;
}
