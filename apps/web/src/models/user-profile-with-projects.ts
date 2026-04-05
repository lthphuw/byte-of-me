import { Project } from '@/models/project';
import { UserProfile } from '@/models/user-profile';

export interface UserProfileWithProjects extends UserProfile {
  projects?: Maybe<Project[]>;
}
