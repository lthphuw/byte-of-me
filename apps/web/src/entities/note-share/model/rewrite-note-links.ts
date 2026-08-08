// Cross-slice import through the note slice's barrel, not a deep file path
// (AGENTS §3). Both are values, not types, so they are imported normally.
import { NOTE_HREF_PREFIX, parseNoteHref } from '@/entities/note';

/** Where an open note lives on the shared surface. */
export const SHARED_NOTE_HREF_PREFIX = '/shared/notes/';

/**
 * Mirrors `NOTE_HREF_PATTERN` in `entities/note/model/note-links.ts`,
 * including the optional locale segment and the bounded id, for the reasons
 * that file gives: a link pasted from the address bar carries `/vi`, and a
 * `.+` id would let a path with further segments below a note look like one.
 */
const SHARED_NOTE_HREF_PATTERN =
  /^(?:\/(?:en|vi))?\/shared\/notes\/([A-Za-z0-9_-]{1,64})$/;

export function parseSharedNoteHref(href: string): string | null {
  const match = SHARED_NOTE_HREF_PATTERN.exec(href.trim());

  return match?.[1] ?? null;
}

export function sharedNoteHref(noteId: string): string {
  return `${SHARED_NOTE_HREF_PREFIX}${noteId}`;
}

/** `toShared` is the way out to a recipient; `toOwner` is the way back in. */
type RewriteDirection = 'toShared' | 'toOwner';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Walk a parsed Tiptap document, visiting every node exactly once. */
function walkNodes(doc: unknown, visit: (node: Record<string, unknown>) => void) {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [doc];

  while (stack.length > 0) {
    const node = stack.pop();

    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }

    if (!isRecord(node) || seen.has(node)) {
      continue;
    }
    seen.add(node);

    visit(node);
    stack.push(...Object.values(node));
  }
}

/**
 * Turn every note link the caller cannot reach into plain text.
 *
 * Applied to the copy that is RENDERED for a viewer, never to the copy an
 * editor saves back — `rewriteNoteLinks` explains why removing a mark from
 * the round-tripped document would destroy the owner's links permanently.
 *
 * The mark is dropped rather than merely made unclickable in CSS. A
 * `pointer-events: none` rule is a styling choice a reader can defeat with
 * devtools, and the claim being made here is that the target is not reachable
 * — that has to be true of the markup, not of its presentation.
 *
 * Only note links are considered: an external URL or a `mailto:` carries no
 * id, so `parseSharedNoteHref` returns null and the mark is left alone.
 */
export function stripUnreachableNoteLinks(
  content: string,
  reachableIds: readonly string[]
): string {
  let doc: unknown;

  try {
    doc = JSON.parse(content);
  } catch {
    return content;
  }

  const reachable = new Set(reachableIds);

  walkNodes(doc, (node) => {
    if (!Array.isArray(node.marks)) {
      return;
    }

    node.marks = node.marks.filter((mark) => {
      if (!isRecord(mark) || mark.type !== 'link' || !isRecord(mark.attrs)) {
        return true;
      }

      const href = mark.attrs.href;
      if (typeof href !== 'string') {
        return true;
      }

      const id = parseSharedNoteHref(href);

      // Not a note link at all, or one that resolves inside the share.
      return id === null || reachable.has(id);
    });
  });

  return JSON.stringify(doc);
}

/**
 * Remap every note link in a Tiptap document between the owner's route and
 * the shared surface's.
 *
 * Out-of-scope links are remapped like any other and NEVER stripped. An
 * editor loads the whole document and saves the whole document back, so
 * removing those marks would permanently destroy the owner's links out of the
 * shared subtree on the first autosave. The renderer decides what is
 * clickable, from the `linkableIds` that `getSharedNoteById` returns alongside
 * the content — hiding an unguessable cuid that points at a route with its own
 * guard is not worth a lossy round trip.
 *
 * Walks the JSON rather than the rendered HTML, iteratively and with a `seen`
 * set, for the reasons `extractNoteLinkIds` records: the document is
 * author-controlled data that has already round-tripped through the database,
 * and a cyclic or pathologically deep one must not be able to blow the stack.
 *
 * Unparseable input comes back untouched. The caller's document is not this
 * function's to reject, and every consumer already handles empty content.
 */
export function rewriteNoteLinks(
  content: string,
  direction: RewriteDirection
): string {
  let doc: unknown;

  try {
    doc = JSON.parse(content);
  } catch {
    return content;
  }

  walkNodes(doc, (node) => {
    if (node.type !== 'link' || !isRecord(node.attrs)) {
      return;
    }

    const href = node.attrs.href;
    if (typeof href !== 'string') {
      return;
    }

    const id =
      direction === 'toShared' ? parseNoteHref(href) : parseSharedNoteHref(href);

    if (id) {
      node.attrs.href =
        direction === 'toShared'
          ? `${SHARED_NOTE_HREF_PREFIX}${id}`
          : `${NOTE_HREF_PREFIX}${id}`;
    }
  });

  return JSON.stringify(doc);
}
