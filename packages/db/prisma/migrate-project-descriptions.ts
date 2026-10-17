/**
 * One-off: rewrite plain-text `ProjectTranslation.description` as stringified Tiptap documents
 * (one paragraph per line); rows already holding a Tiptap document are skipped, so it is idempotent.
 *   cd packages/db && bunx tsx prisma/migrate-project-descriptions.ts [--dry-run]
 */
import { prisma } from '../src';

const dryRun = process.argv.includes('--dry-run');

function isTiptapDoc(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { type?: unknown }).type === 'doc'
    );
  } catch {
    return false;
  }
}

function plainTextToDoc(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: text.split(/\r?\n/).map((line) => {
      const trimmed = line.trim();
      return trimmed
        ? {
            type: 'paragraph',
            content: [{ type: 'text', text: trimmed }],
          }
        : { type: 'paragraph' };
    }),
  });
}

async function main() {
  const rows = await prisma.projectTranslation.findMany({
    select: { id: true, language: true, description: true, projectId: true },
  });

  let converted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.description || isTiptapDoc(row.description)) {
      skipped++;
      continue;
    }

    const preview = row.description.slice(0, 60).replace(/\n/g, '\\n');
    console.log(
      `${dryRun ? '[dry-run] would convert' : 'converting'} ` +
        `${row.projectId}/${row.language}: "${preview}${row.description.length > 60 ? '…' : ''}"`
    );

    if (!dryRun) {
      await prisma.projectTranslation.update({
        where: { id: row.id },
        data: { description: plainTextToDoc(row.description) },
      });
    }

    converted++;
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}done: ${converted} converted, ${skipped} already rich text or empty (of ${rows.length} rows)`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
