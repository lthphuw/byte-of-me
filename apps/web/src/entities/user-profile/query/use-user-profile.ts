'use client';

import { useQuery } from '@tanstack/react-query';

import { userProfileQueries } from './user-profile-queries';

import type { AdminUserProfile } from '@/entities/user-profile/model/types';

/**
 * The signed-in owner's profile for the profile form, seeded with the server's
 * render so the form never waits on a read.
 */
export function useUserProfile(initUser: AdminUserProfile) {
  return useQuery({
    ...userProfileQueries.profile(initUser.id),
    // The server render is the first paint, so the form never waits on a read.
    initialData: initUser,
    // The form seeds once per profile, so a focus refetch after the 60s
    // staleTime would only be thrown away.
    refetchOnWindowFocus: false,
  });
}
