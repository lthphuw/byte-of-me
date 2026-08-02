import { prisma } from '../src';

/**
 * Development-only sample data for the private notes feature.
 *
 * Kept separate from `seed.ts` because that one is the portfolio's real
 * content and is meant to be re-runnable against any environment. This one
 * writes throwaway notes whose only job is to give the notes workspace
 * something to render while it is being exercised by hand — a nested tree, a
 * pinned note, an archived note, and bodies with distinctive words that only
 * appear in the body, so search can be tested for what it actually claims to
 * do (match `plainText`, not just titles).
 *
 * Run:
 *   cd packages/db && DATABASE_URL="postgresql://admin:secret@localhost:5432/byte_of_me" bun run prisma/seed-notes.ts
 */

/**
 * Hard guard, not a convention. `packages/db/.env` holds production Supabase
 * credentials and Bun auto-loads it, so an un-overridden run of this file
 * would write junk notes into the real database. Notes are private by design
 * and nobody would see them there until they were already a mess.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';

  const isLocal =
    url.includes('@localhost') ||
    url.includes('@127.0.0.1') ||
    url.includes('@host.docker.internal');

  if (!isLocal) {
    throw new Error(
      'seed-notes refuses to run: DATABASE_URL does not point at a local database.\n' +
        'This script writes sample data and must never touch production.\n' +
        'Re-run with an explicit override, e.g.\n' +
        '  DATABASE_URL="postgresql://admin:secret@localhost:5432/byte_of_me" bun run prisma/seed-notes.ts'
    );
  }
}

/** A Tiptap paragraph document. `content` is stored as stringified Tiptap JSON. */
function doc(...paragraphs: string[]) {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    })),
  };
}

/**
 * Mirrors `richTextToPlainText` from `@byte-of-me/ui/lib/rich-text-content`,
 * which is what the server derives `plainText` with on every save.
 *
 * Deliberately inlined rather than imported: `packages/db` does not depend on
 * `packages/ui`, and adding that dependency so a dev-only seed script can
 * reuse five lines would be a worse trade than the duplication.
 */
function toPlainText(document: ReturnType<typeof doc>): string {
  return document.content
    .map((node) => (node.content ?? []).map((child) => child.text).join(''))
    .filter(Boolean)
    .join(' ')
    .trim();
}

type SeedNote = {
  key: string;
  title: string;
  body: string[];
  parent?: string;
  isPinned?: boolean;
  archived?: boolean;
};

/**
 * The distinctive words below (`rebalance`, `kintsugi`, `bicarbonate`,
 * `perihelion`) appear ONLY in bodies, never in a title — searching for one is
 * the quickest way to confirm search reads `plainText` rather than `title`.
 */
const NOTES: SeedNote[] = [
  {
    key: 'engineering',
    title: 'Engineering',
    body: ['Parent note. Things I want to remember about building software.'],
    isPinned: true,
  },
  {
    key: 'kafka',
    title: 'Kafka consumer groups',
    parent: 'engineering',
    body: [
      'A consumer group rebalance stops the world for the whole group, not just the consumer that left.',
      'Static membership avoids a rebalance when a pod restarts within the session timeout.',
    ],
  },
  {
    key: 'postgres',
    title: 'Postgres indexes',
    parent: 'engineering',
    body: [
      'A partial index is often smaller and faster than a filtered query over a full one.',
      'Index-only scans need the visibility map to be current, so an unvacuumed table quietly loses them.',
    ],
  },
  {
    key: 'postgres-locks',
    title: 'Lock contention',
    parent: 'postgres',
    body: [
      'Nested a level deeper on purpose, so the tree has something to collapse.',
      'ALTER TABLE takes ACCESS EXCLUSIVE, which queues behind and ahead of everything else.',
    ],
  },
  {
    key: 'reading',
    title: 'Reading list',
    body: [
      'Books and long reads I have not finished yet.',
      'The essay on kintsugi and repair as a design value is the one to reread first.',
    ],
  },
  {
    key: 'kitchen',
    title: 'Kitchen notes',
    body: [
      'Baking soda is sodium bicarbonate; baking powder is that plus an acid, which is why one needs buttermilk and the other does not.',
    ],
  },
  {
    key: 'astronomy',
    title: 'Half-finished thought',
    body: [
      'Something about how perihelion has nothing to do with which hemisphere is having summer.',
      'Left deliberately unfinished.',
    ],
  },
  {
    key: 'old-idea',
    title: 'Abandoned idea',
    body: ['Archived on purpose, so the archived filter has something to hide.'],
    archived: true,
  },
];

async function main() {
  assertLocalDatabase();

  /**
   * `NOTES_OWNER_ID` exists because a JWT session outlives the database it was
   * issued against. Signing in while `DATABASE_URL` pointed at one database and
   * then pointing it at another leaves a valid session whose `user.id` is a row
   * that does not exist locally — the owner guard still admits it (it checks
   * role and email, both carried on the token), but every note query is scoped
   * by `ownerId` and therefore matches nothing. The workspace renders its empty
   * state, correctly, for notes that do exist.
   *
   * Pass the id from `/api/auth/session` to seed against the identity the
   * browser is actually holding:
   *   NOTES_OWNER_ID=<id> DATABASE_URL=<local> bun run prisma/seed-notes.ts
   */
  const requestedOwnerId = process.env.NOTES_OWNER_ID?.trim();

  const owner = requestedOwnerId
    ? await prisma.user.upsert({
        where: { id: requestedOwnerId },
        update: { role: 'ADMIN' },
        // A placeholder address on a reserved-by-RFC TLD, so it can never
        // collide with the real owner's row or be mistaken for a live account.
        // The guard reads the email off the session token, not off this row.
        create: {
          id: requestedOwnerId,
          email: `local-session-${requestedOwnerId}@dev.invalid`,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
        select: { id: true, email: true },
      })
    : await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, email: true },
      });

  if (!owner) {
    throw new Error(
      'No ADMIN user found. Run the main seed first: bun run db:seed'
    );
  }

  console.log(`Seeding notes for ${owner.email}...`);

  // Idempotent: wipe only this owner's notes, so re-running does not pile up
  // duplicates. Children cascade, so deleting roots is enough.
  const removed = await prisma.note.deleteMany({ where: { ownerId: owner.id } });
  if (removed.count > 0) {
    console.log(`  removed ${removed.count} existing note(s)`);
  }

  const idByKey = new Map<string, string>();

  // Sequential rather than parallel: a child cannot be created before its
  // parent exists, and the list is ordered so parents come first.
  for (const [index, note] of NOTES.entries()) {
    const document = doc(...note.body);
    const parentId = note.parent ? idByKey.get(note.parent) : null;

    if (note.parent && !parentId) {
      throw new Error(`Parent "${note.parent}" not seeded before "${note.key}"`);
    }

    const created = await prisma.note.create({
      data: {
        ownerId: owner.id,
        title: note.title,
        content: JSON.stringify(document),
        plainText: toPlainText(document),
        parentId: parentId ?? null,
        position: index,
        isPinned: note.isPinned ?? false,
        archivedAt: note.archived ? new Date() : null,
      },
      select: { id: true },
    });

    idByKey.set(note.key, created.id);
  }

  const active = NOTES.filter((n) => !n.archived).length;
  console.log(
    `Seeded ${NOTES.length} notes (${active} active, ${NOTES.length - active} archived).`
  );
  console.log('Try searching for: rebalance, kintsugi, bicarbonate, perihelion');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
