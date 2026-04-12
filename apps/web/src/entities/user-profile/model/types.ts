import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminUserProfile = Prisma.UserGetPayload<{
  include: {
    userProfile: {
      include: {
        translations: true;
      };
    };
    socialLinks: true;
  };
}>;


export interface PublicUserProfile {
  role?: string;
  email?: string;
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
