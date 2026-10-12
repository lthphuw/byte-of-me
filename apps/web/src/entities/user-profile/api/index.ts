// This barrel is reachable from client components (via `entities/user-profile/index.ts`:
// `homepage-profile.tsx` imports it), so it re-exports only `'use server'` actions.
// A plain server module that value-imports `prisma` must never be added here: it
// would drag prisma into the browser bundle.
export * from './get-public-user-profile';
export * from './get-user-profile';
export * from './get-user-profile-with-translations';
export * from './save-profile';
