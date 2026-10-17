import * as authBarrel from '@/shared/lib/auth';

/** Mirrors `TestUser` in `next-runtime-stubs.ts`. */
export interface TestUser {
  id: string;
  role: string;
  email?: string;
}

interface StubbedAuthBarrel {
  __setTestUser: (user: TestUser | null) => void;
  __resetTestUser: () => void;
}

/**
 * Set the identity every auth helper derives from, for one spec. `__setTestUser` exists only on the
 * `stub-auth` barrel in next-runtime-stubs.ts, not on the real module, so one cast bridges it here.
 * The default identity is the site owner; use this for the 401 paths.
 */
export const setTestUser = (authBarrel as unknown as StubbedAuthBarrel)
  .__setTestUser;

/**
 * Restore the site owner: every spec that calls `setTestUser` must call this in `afterAll`.
 * One process, one mutable identity: a leaked non-owner makes `requireAdmin()` throw Unauthorized
 * in unrelated specs, which pass alone and fail only in the full run.
 */
export const resetTestUser = (authBarrel as unknown as StubbedAuthBarrel)
  .__resetTestUser;
