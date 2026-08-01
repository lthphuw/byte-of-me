/**
 * Test preload: force the database URL to an unreachable local placeholder.
 *
 * Assignment is unconditional, and that is the whole point. Bun auto-loads
 * `apps/web/.env` *before* this preload runs — unlike jest, which loaded no
 * env at all — so `DATABASE_URL` already holds the real Supabase production
 * value by the time this file executes. A `??=` guard here is a no-op, and
 * during the Bun migration it let a spec issue real upserts and deletes
 * against the production `rate_limit_hits` table.
 *
 * Nothing in this suite should reach a database: specs either inject fakes or
 * replace the Prisma delegate. The placeholder points at a port nothing
 * listens on, so an unnoticed real query fails loudly instead of succeeding
 * silently against production.
 *
 * NODE_ENV is deliberately not set: `bun test` already sets it to 'test', and
 * Next.js's bundled types mark `process.env.NODE_ENV` readonly, so assigning
 * it here fails `tsc --noEmit`.
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
