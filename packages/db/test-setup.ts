/**
 * Test preload: force the database URL to an unreachable local placeholder.
 *
 * Assignment is unconditional, and that is the whole point. Bun auto-loads
 * `packages/db/.env` *before* this preload runs — unlike jest, which loaded no
 * env at all — so `DATABASE_URL` already holds the real Supabase production
 * value by the time this file executes. A `??=` guard here is a no-op. See
 * `apps/web/test-setup.ts` for the incident that motivated this.
 *
 * These specs construct Prisma clients with injected fakes and never issue a
 * query. The placeholder points at a port nothing listens on, so an unnoticed
 * real query fails loudly instead of succeeding silently against production.
 *
 * NODE_ENV is deliberately not set: `bun test` already sets it to 'test'.
 */
const TEST_DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;

// Belt and braces: if a future change reorders preloads or a spec sets its own
// URL, fail the run rather than let it reach a real host.
for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
  const value = process.env[key] ?? '';
  if (!value.includes('127.0.0.1') && !value.includes('localhost')) {
    throw new Error(
      `${key} points at a non-local host during tests (${value.replace(/\/\/[^@]*@/, '//***@')}). ` +
        'Refusing to run — see apps/web/test-setup.ts.'
    );
  }
}
