import { unwrapApiResponse } from '@byte-of-me/api-core';
import { userProfileKeys } from '@byte-of-me/contracts/user-profile';
import { queryOptions } from '@tanstack/react-query';

import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';

export const userProfileQueries = {
  /**
   * The signed-in owner's profile with every translation, for the profile form.
   * The action reads the session, so `userId` only names the cache entry.
   */
  profile: (userId: string) =>
    queryOptions({
      queryKey: userProfileKeys.profile(userId),
      queryFn: async () => unwrapApiResponse(await getAdminUserProfile()),
    }),
};
