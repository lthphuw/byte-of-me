/**
 * A published R&D document links to its siblings by relative path, the way it
 * reads in the repo: `[baseline](./experiments/exp-001.md)`. That is a *source*
 * syntax. It never reaches the stored document — this module resolves it to the
 * id-anchored href `note-links.ts` documents, which is what survives a rename
 * and what `update-note` turns into `NoteLink` rows.
 *
 * Rewriting happens after every note in the request exists, because a link may
 * point at a file created in the same publish.
 */
import type { JSONContent } from '@tiptap/core';

import { noteHref } from './note-links';

/**
 * The project-relative path a link points at, or `null` when the href is not a
 * relative markdown link at all — an external URL, a mailto:, an absolute app
 * route, or an image.
 *
 * `..` may not climb above the project root. A publish payload is authored
 * outside this codebase, so the traversal guard is not hypothetical politeness:
 * without it a crafted href resolves to a path that could collide with another
 * project's notes in the id map.
 */
export function resolveRndPath(fromPath: string, href: string): string | null {
  const target = href.trim();

  if (!target.endsWith('.md')) return null;
  if (target.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;

  const fromSegments = fromPath.split('/').slice(0, -1);
  const resolved: string[] = [...fromSegments];

  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (resolved.length === 0) return null; // escaped the project root
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.length > 0 ? resolved.join('/') : null;
}

/**
 * The document with every resolvable relative link swapped for a note href.
 *
 * Returns a new tree; the caller still holds the original. An unresolvable
 * target is left exactly as written rather than dropped — `rnd-validate`
 * rejects a dangling link at authoring time, so anything reaching here is
 * either external or a bug worth being able to see in the published note.
 */
export function rewriteRndLinks(
  doc: JSONContent,
  fromPath: string,
  idByPath: ReadonlyMap<string, string>
): JSONContent {
  const rewriteMarks = (marks: JSONContent['marks']): JSONContent['marks'] =>
    marks?.map((mark) => {
      if (mark.type !== 'link' || typeof mark.attrs?.href !== 'string') return mark;

      const path = resolveRndPath(fromPath, mark.attrs.href);
      const id = path ? idByPath.get(path) : undefined;
      if (!id) return mark;

      return { ...mark, attrs: { ...mark.attrs, href: noteHref(id) } };
    });

  const walk = (node: JSONContent): JSONContent => ({
    ...node,
    ...(node.marks ? { marks: rewriteMarks(node.marks) } : {}),
    ...(node.content ? { content: node.content.map(walk) } : {}),
  });

  return walk(doc);
}
