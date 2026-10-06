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
 * Set the identity every auth helper derives from, for the duration of a spec.
 *
 * `__setTestUser` is injected by the `stub-auth` plugin in
 * `next-runtime-stubs.ts`, which replaces the whole `@/shared/lib/auth`
 * barrel during `bun test`. It has no declaration on the real module, and
 * deliberately so — a hook that reassigns the signed-in user must not be
 * reachable from production code — so a cast is what bridges the two.
 *
 * That cast lives here, once, rather than in every spec that needs a
 * non-owner caller. The stub's default identity is the site owner, which is
 * what most specs want; the ones that exercise the 401 paths need somebody
 * else.
 *
 * Named `.test-helper.ts` and colocated with the module it bridges, following
 * `lazy-rich-text-editor.test-stub.ts`. Nothing in `src/` imports it outside a
 * spec.
 */
export const setTestUser = (authBarrel as unknown as StubbedAuthBarrel)
  .__setTestUser;

/**
 * Put the identity back to the site owner. **Every spec that calls
 * `setTestUser` must call this in `afterAll`.**
 *
 * `bun test` runs every spec file in one process and the stub holds a single
 * mutable identity, so a file that switches to a non-owner and does not
 * restore it leaves `requireAdmin()` throwing for every spec that runs after
 * it. The symptom is an "Unauthorized" raised from an unrelated action, in a
 * file that passes perfectly well on its own — which is exactly how it was
 * found: a few specs green in isolation, dozens of unrelated ones red in the
 * full run.
 */
export const resetTestUser = (authBarrel as unknown as StubbedAuthBarrel)
  .__resetTestUser;
