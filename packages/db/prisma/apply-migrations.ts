/**
 * Applies every pending migration. Use this on a new database instead of
 * `prisma migrate deploy`, which is the same thing plus the fallback below.
 *
 * Prisma runs each migration in one transaction, and PostgreSQL refuses
 * `CREATE INDEX CONCURRENTLY` inside a transaction block. When a migration
 * fails for that reason, its statements run one at a time (autocommit), the
 * migration is recorded with `migrate resolve --applied`, and deploy resumes.
 * Only plain `;`-separated statements are supported in such a file.
 */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { prisma } from '../src';

const PACKAGE_DIR = join(import.meta.dirname, '..');
const MIGRATIONS_DIR = join(PACKAGE_DIR, 'prisma', 'migrations');

function runPrisma(args: string[]) {
  const result = spawnSync('bunx', ['prisma', ...args], {
    cwd: PACKAGE_DIR,
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

function failedMigrationName(output: string): string | undefined {
  // P3018 prints "Migration name: X"; P3009 (already failed) prints "The `X` migration started at …".
  return (
    output.match(/Migration name: (\S+)/)?.[1] ??
    output.match(/The `([^`]+)` migration started at/)?.[1]
  );
}

function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function main() {
  const attempted = new Set<string>();

  for (;;) {
    const deploy = runPrisma(['migrate', 'deploy']);
    if (deploy.ok) {
      console.log(deploy.output.trim());
      return;
    }

    const name = failedMigrationName(deploy.output);
    if (!name || attempted.has(name)) {
      throw new Error(deploy.output);
    }
    attempted.add(name);

    const sql = await readFile(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
    if (!sql.includes('CONCURRENTLY')) {
      throw new Error(deploy.output);
    }

    console.log(`Applying ${name} statement by statement (CONCURRENTLY)…`);
    for (const statement of splitStatements(sql)) {
      await prisma.$executeRawUnsafe(statement);
    }

    const resolve = runPrisma(['migrate', 'resolve', '--applied', name]);
    if (!resolve.ok) {
      throw new Error(resolve.output);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
