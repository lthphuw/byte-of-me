import { Base } from '@/models/base';

export interface UserProfile extends Base {
  role: string;
  email: string;
  displayName?: Maybe<string>;
  firstName?: Maybe<string>;
  lastName?: Maybe<string>;
  middleName?: Maybe<string>;
  birthdate?: Maybe<Date>;
  greeting?: Maybe<string>;
  tagLine?: Maybe<string>;
  quote?: Maybe<string>;
  quoteAuthor?: Maybe<string>;
  bio?: Maybe<string>;
  aboutMe?: Maybe<string>;
}
