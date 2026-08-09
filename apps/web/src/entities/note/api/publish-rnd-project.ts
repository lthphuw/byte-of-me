/**
 * Publish one R&D project's markdown tree into the vault.
 *
 * NOT a server action — no `'use server'`, no `requireAdmin()`. The caller is
 * `app/api/rnd/publish/route.ts`, which authenticates a bearer token and
 * resolves the owner itself, then passes `ownerId` in. Everything else in this
 * directory follows the §8 server-action shape; this and
 * `ensure-note-folder-path.ts` are the documented exceptions.
 *
 * Also unlike the rest of this directory: NOT re-exported from `./index.ts`.
 * Every other file there is shielded from the client bundle by its own
 * `'use server'` directive; this one has no such shield, so starring it into
 * the barrel would drag `prisma` (and `pg`) into the browser bundle by way of
 * `entities/note/index.ts`, which client components already import for
 * unrelated symbols. Import this module by its own path, as the route handler
 * does. `import 'server-only'` below is the backstop in case a future import
 * reaches it anyway.
 *
 * No `revalidateTag`: notes have no public surface and the dashboard is never
 * cached, exactly as `create-note.ts` records.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';
import { parseMarkdownToTiptap } from '@byte-of-me/ui/rich-text-markdown';

import 'server-only';

import { ensureNoteFolderPath } from './ensure-note-folder-path';

import { extractNoteLinkIds, noteHref } from '@/entities/note/model/note-links';
import { rewriteRndLinks } from '@/entities/note/model/rnd-links';
import type { RndPublishInput } from '@/entities/note/model/rnd-publish-schema';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export interface RndPublishFileResult {
  path: string;
  noteId: string;
  action: 'created' | 'updated';
  url: string;
}

export interface RndPublishResult {
  results: RndPublishFileResult[];
  archived: string[];
}

/** Frontmatter keys that own a column and must not be duplicated into `properties`. */
const COLUMN_KEYS = new Set(['title', 'status']);

/**
 * Publish the whole project, or none of it.
 *
 * One transaction: a half-published project — experiments updated,
 * `04-results.md` still stale — is worse than a failed publish, because it
 * looks finished.
 */
export async function publishRndProject(
  ownerId: string,
  input: RndPublishInput
): Promise<ApiResponse<RndPublishResult>> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // 1. The project's own folder. Intermediate segments are titled by their
      //    path segment; the leaf takes the request's display title.
      const segments = input.notesRoot.split('/').filter(Boolean);
      const projectFolderId = await ensureNoteFolderPath(
        tx,
        ownerId,
        segments.map((segment, index) => ({
          title: index === segments.length - 1 ? input.title : segment,
        }))
      );

      // 2. Sub-folders implied by the file paths, resolved once each.
      const folderIdByPath = new Map<string, string | null>([['', projectFolderId]]);

      const folderIdFor = async (filePath: string): Promise<string | null> => {
        const dir = filePath.split('/').slice(0, -1).join('/');
        const cached = folderIdByPath.get(dir);
        if (cached !== undefined) return cached;

        // Relative to the project folder — `experiments/` belongs inside the
        // project, not at the vault root.
        const id = await ensureNoteFolderPath(
          tx,
          ownerId,
          dir.split('/').filter(Boolean).map((title) => ({ title })),
          projectFolderId
        );
        folderIdByPath.set(dir, id);
        return id;
      };

      // Sequential: two files in the same directory must not race to create it.
      // The parsed document is carried forward rather than re-parsed in the
      // link pass — markdown parsing is the expensive step here, and doing it
      // twice per file would double the cost of every publish for nothing.
      const upserts: {
        file: (typeof input.files)[number];
        doc: ReturnType<typeof parseMarkdownToTiptap>;
        result: RndPublishFileResult;
      }[] = [];

      for (const file of input.files) {
        const parentId = await folderIdFor(file.path);
        const doc = parseMarkdownToTiptap(file.markdown);
        const content = JSON.stringify(doc);
        const title = String(file.frontmatter.title);
        const status = typeof file.frontmatter.status === 'string' ? file.frontmatter.status : 'draft';

        // `rnd_project` + `rnd_path` is the identity, not the title: a note
        // retitled in frontmatter must update in place rather than fork a
        // second note.
        //
        // The project half is not decoration. `rnd_path` is relative to
        // `docs/rnd/`, so EVERY project has a `00-overview.md` — keyed on the
        // path alone, one project's publish would reach into another's notes.
        const properties: Record<string, string | number | boolean> = {
          rnd_path: file.path,
          rnd_project: input.project,
        };
        for (const [key, value] of Object.entries(file.frontmatter)) {
          if (COLUMN_KEYS.has(key)) continue;
          properties[key] = Array.isArray(value) ? value.join(', ') : value;
        }

        // Matched on the project-qualified identity, NOT on `parentId`.
        // Keying on the parent would fork a second note whenever a file moves
        // between directories in the repo — the move would read as a delete
        // plus a create, and the note's links and history would be lost.
        const existing = await tx.note.findFirst({
          where: {
            ownerId,
            AND: [
              { properties: { path: ['rnd_project'], equals: input.project } },
              { properties: { path: ['rnd_path'], equals: file.path } },
            ],
          },
          select: { id: true },
        });

        if (existing) {
          await tx.note.update({
            where: { id: existing.id },
            data: {
              title,
              status,
              content,
              plainText: richTextToPlainText(content),
              properties,
              // Re-parented on every publish, because the identity is the
              // project-qualified path rather than the tree position: a file
              // moved into `experiments/` in the repo has to move in the vault
              // too, or the two stop describing the same thing.
              parentId,
              // A file that comes back after being deleted returns from the
              // trash rather than arriving as a second note.
              archivedAt: null,
            },
          });
          upserts.push({
            file,
            doc,
            result: { path: file.path, noteId: existing.id, action: 'updated', url: noteHref(existing.id) },
          });
          continue;
        }

        const last = await tx.note.findFirst({
          where: { ownerId, parentId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const note = await tx.note.create({
          data: {
            ownerId,
            title,
            status,
            content,
            plainText: richTextToPlainText(content),
            properties,
            parentId,
            position: (last?.position ?? -1) + 1,
          },
          select: { id: true },
        });

        upserts.push({
          file,
          doc,
          result: { path: file.path, noteId: note.id, action: 'created', url: noteHref(note.id) },
        });
      }

      // 3. Link pass. Runs only now, because a link may point at a file created
      //    a moment ago in this same loop.
      const idByPath = new Map(upserts.map((u) => [u.file.path, u.result.noteId]));

      for (const { file, doc, result } of upserts) {
        const linked = rewriteRndLinks(doc, file.path, idByPath);
        const content = JSON.stringify(linked);

        // Only the document write is conditional on the rewrite having
        // changed anything. The NoteLink rebuild below is NOT — it runs on
        // every note in `upserts`, same as `update-note.ts:61` gates on a
        // write having happened, never on content having changed. A rewrite
        // that removes the last link, or a document authored with an
        // already-absolute `/space/notes/<id>` href (which `resolveRndPath`
        // leaves untouched, so the rewrite is a no-op), would otherwise never
        // clear or create the corresponding NoteLink rows.
        if (content !== JSON.stringify(doc)) {
          await tx.note.update({
            where: { id: result.noteId },
            data: { content, plainText: richTextToPlainText(content) },
          });
        }

        // Same contract as `update-note.ts`: links are rebuilt from the
        // document, never patched. Self-links are dropped, and a target is
        // only linked if it belongs to this owner.
        const linkedIds = extractNoteLinkIds(content).filter((id) => id !== result.noteId);
        const targets = linkedIds.length
          ? await tx.note.findMany({
              where: { ownerId, id: { in: linkedIds } },
              select: { id: true },
            })
          : [];

        await tx.noteLink.deleteMany({ where: { sourceId: result.noteId } });
        if (targets.length) {
          await tx.noteLink.createMany({
            data: targets.map((target) => ({ sourceId: result.noteId, targetId: target.id })),
            skipDuplicates: true,
          });
        }
      }

      // 4. Archive what the repo no longer has. Never a hard delete: a file
      //    removed by mistake must be recoverable from the trash.
      const archived: string[] = [];
      for (const path of input.deleted) {
        const gone = await tx.note.updateMany({
          where: {
            ownerId,
            archivedAt: null,
            // Both halves, for the same reason the upsert uses both: keyed on
            // the path alone, deleting `00-overview.md` from one project would
            // archive every other project's overview too.
            AND: [
              { properties: { path: ['rnd_project'], equals: input.project } },
              { properties: { path: ['rnd_path'], equals: path } },
            ],
          },
          data: { archivedAt: new Date() },
        });
        if (gone.count > 0) archived.push(path);
      }

      return { results: upserts.map((u) => u.result), archived };
    });

    return { success: true, data: outcome };
  } catch (error) {
    // Interpolated, like every other action in this directory (`archive-note.ts`,
    // `create-note.ts`, `update-note.ts`, `move-note.ts`, ...) — passing `error`
    // as a structured field serializes an `Error` instance to `{}`, throwing
    // away the one thing an operator needs after a failed publish.
    const errorMsg = getErrorMessage(error);
    logger.error(`Publish rnd project error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
