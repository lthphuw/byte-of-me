import { Base } from '@/models/base';
import { Task } from '@/models/task';

export interface Role extends Base {
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  title: Maybe<string>;
  description: Maybe<string>;
  tasks: Task[];
}
