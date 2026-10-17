// Bun loads the workspace .env before preloads, so DATABASE_URL is production
// here: assign it unconditionally (`??=` is a no-op). NODE_ENV stays unset
// because Next types it readonly and tsc rejects the assignment.
const TEST_DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;

// Fails the run if a later preload or a spec points either URL at a real host.
for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
  const value = process.env[key] ?? '';
  if (!value.includes('127.0.0.1') && !value.includes('localhost')) {
    throw new Error(
      `${key} points at a non-local host during tests (${value.replace(/\/\/[^@]*@/, '//***@')}). ` +
        'Refusing to run: see packages/config/test/db-guard.ts.'
    );
  }
}
