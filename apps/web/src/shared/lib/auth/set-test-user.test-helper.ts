import * as authBarrel from '@/shared/lib/auth';

/** Mirrors `TestUser` in `next-runtime-stubs.ts`. */
export interface TestUser {
  id: string;
  role: string;
  email?: string;
}

interface StubbedAuthBarrel {
  __setTestUser: (user: TestUser | null) => void;
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
 * what every note spec wants; the note-share specs are the first that need
 * somebody else, because the entire feature is about callers who are not the
 * owner.
 *
 * Named `.test-helper.ts` and colocated with the module it bridges, following
 * `lazy-rich-text-editor.test-stub.ts`. Nothing in `src/` imports it outside a
 * spec.
 */
export const setTestUser = (authBarrel as unknown as StubbedAuthBarrel)
  .__setTestUser;
