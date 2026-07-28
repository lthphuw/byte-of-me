export const userProfileKeys = {
  all: ['user-profile'] as const,
  profile: (userId: string) =>
    [...userProfileKeys.all, 'profile', userId] as const,
};
