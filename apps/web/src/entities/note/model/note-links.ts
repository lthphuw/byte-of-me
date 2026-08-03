/**
 * Note-to-note links are ordinary Tiptap link marks whose `href` is the
 * note's own route. Nothing else is stored in the document — no custom node,
 * no `data-note-id` attribute.
 *
 * That is deliberate on two counts. `packages/ui/src/lib/sanitize.ts` allows
 * `href` and restricts schemes to http/https/mailto/tel; a relative path
 * carries no scheme, so it survives sanitization untouched, and no attribute
 * has to be added to a security-critical allowlist. And a link anchored to an
 * **id** does not break when the target is renamed — the failure mode
 * `[[Wiki Title]]` syntax has. The link *text* is whatever the author sees at
 * insert time; the panel resolves current titles from the database.
 */

/** The route an open note lives at. */
export const NOTE_HREF_PREFIX = '/space/notes/';

export function noteHref(noteId: string): string {
  return `${NOTE_HREF_PREFIX}${noteId}`;
}

/**
 * The id in a note href, or `null` for anything else — an external URL, a
 * mailto:, another part of the site.
 *
 * The optional leading locale segment is not hypothetical: this app prefixes
 * every route with the locale, so a link the author pastes from their own
 * address bar arrives as `/vi/space/notes/<id>`, and dropping those would
 * quietly lose real links. The id pattern is bounded rather than `.+` so a
 * path with further segments below a note cannot be mistaken for one.
 */
const NOTE_HREF_PATTERN =
  /^(?:\/(?:en|vi))?\/space\/notes\/([A-Za-z0-9_-]{1,64})$/;

export function parseNoteHref(href: string): string | null {
  const match = NOTE_HREF_PATTERN.exec(href.trim());
  return match?.[1] ?? null;
}

/** The shape of a Tiptap node as far as this walk cares. */
interface RichTextNode {
  content?: unknown;
  marks?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Every note id linked from a document, in first-appearance order and without
 * duplicates.
 *
 * Walks the JSON rather than the rendered HTML: the document is already
 * structured, and parsing HTML back out would mean trusting the renderer to
 * be lossless about exactly the attribute that matters.
 *
 * Iterative rather than recursive, with a `seen` set over visited objects: a
 * document is author-controlled data that has already made a round trip
 * through the database, and a cyclic or pathologically deep one must not be
 * able to blow the stack inside a server action.
 */
export function extractNoteLinkIds(content: string): string[] {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    // A document that does not parse has no links to speak of. Callers treat
    // this as "no links", not as an error: the save that produced it is the
    // thing that would be wrong, and it is validated separately.
    return [];
  }

  const ids: string[] = [];
  const found = new Set<string>();
  const seen = new Set<unknown>();
  const queue: unknown[] = [doc];

  while (queue.length) {
    const node = queue.pop();
    if (!isRecord(node) || seen.has(node)) continue;
    seen.add(node);

    const { marks, content: children } = node as RichTextNode;

    if (Array.isArray(marks)) {
      for (const mark of marks) {
        if (!isRecord(mark) || mark.type !== 'link') continue;
        const attrs = mark.attrs;
        if (!isRecord(attrs) || typeof attrs.href !== 'string') continue;

        const id = parseNoteHref(attrs.href);
        if (id && !found.has(id)) {
          found.add(id);
          ids.push(id);
        }
      }
    }

    if (Array.isArray(children)) {
      // Pushed in reverse so `pop()` above visits them left to right, which
      // is what makes "first-appearance order" true rather than incidental.
      for (let i = children.length - 1; i >= 0; i -= 1) {
        queue.push(children[i]);
      }
    }
  }

  return ids;
}
