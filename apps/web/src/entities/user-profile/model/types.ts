import type { Prisma } from '@byte-of-me/db/types';

export type AdminUserProfile = Prisma.UserGetPayload<{
  include: {
    userProfile: {
      include: {
        translations: {
          select: {
            id: true;
            language: true;
            displayName: true;
            firstName: true;
            middleName: true;
            lastName: true;
            greeting: true;
            tagLine: true;
            quote: true;
            quoteAuthor: true;
            bio: true;
            aboutMe: true;
          };
        };
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
