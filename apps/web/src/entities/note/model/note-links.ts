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

/** Whether a node's `marks` include a link pointing at `noteId`. */
function marksLinkToNote(marks: unknown, noteId: string): boolean {
  if (!Array.isArray(marks)) return false;

  for (const mark of marks) {
    if (!isRecord(mark) || mark.type !== 'link') continue;
    const attrs = mark.attrs;
    if (!isRecord(attrs) || typeof attrs.href !== 'string') continue;
    // Through `parseNoteHref`, not a string compare, so the locale-prefixed
    // form the address bar produces (`/vi/space/notes/<id>`) matches too — a
    // link the author pasted from their own tab is the common case, and it
    // would otherwise be the one link a rename silently left stale.
    if (parseNoteHref(attrs.href) === noteId) return true;
  }

  return false;
}

/**
 * Rewrite the VISIBLE TEXT of links pointing at `options.noteId` from
 * `options.from` to `options.to`.
 *
 * The header of this file explains why an id-anchored href survives a rename
 * where `[[Wiki Title]]` does not. This function closes the other half of
 * that trade: navigation keeps working, but the anchor's text is a snapshot
 * of the target's title taken at insert time, so after a rename every
 * inbound link still *reads* as the old name.
 *
 * The match is deliberately narrow — a text node is rewritten only when it
 * links to this note AND its text is character-for-character the old title.
 * Case-sensitive, and with no trimming, because both of those are how a
 * hand-edited label announces itself. This is Obsidian's behaviour and it was
 * chosen over "rewrite the text of every link to this note":
 *
 * - `[xem bài trước](/space/notes/x)` is a sentence the author wrote. Turning
 *   it into the note's title would corrupt prose, and there is no undo for a
 *   rewrite that happened inside a rename of a different note.
 * - A differently-cased or differently-spaced copy is evidence of the same
 *   thing: somebody typed it rather than inserting it, so it is not ours to
 *   change.
 *
 * The cost is that a link whose label the author tweaked keeps the old title
 * forever. That is the intended trade: leaving a stale label is recoverable
 * by hand, silently overwriting authored prose is not.
 *
 * Iterative with an explicit worklist, for the reason `extractNoteLinkIds`
 * documents above — this runs inside a server action over author-controlled
 * data that has already round-tripped through the database, and must not be
 * able to blow the stack. The `seen` map does double duty here: a recursive
 * *copy* of a cyclic or shared-reference graph would not merely be deep, it
 * would never terminate, so every source object is mapped to its copy before
 * its children are filled in and a second visit re-uses that copy.
 *
 * Never throws. Content that does not parse is returned untouched with
 * `changed: 0`, the same way `extractNoteLinkIds` treats it as "no links":
 * the save that produced it is the thing that would be wrong, and that is
 * validated elsewhere. A rename must not fail because some *other* note holds
 * a broken document.
 */
export function relabelNoteLinks(
  content: string,
  options: { noteId: string; from: string; to: string }
): { content: string; changed: number } {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return { content, changed: 0 };
  }

  const { noteId, from, to } = options;

  let changed = 0;
  // Source object → its copy. Populated *before* the copy is filled, so a
  // cycle resolves to the same (eventually complete) reference instead of
  // looping, and a node reachable by two paths is copied once.
  const copies = new Map<object, unknown>();
  const root: { value: unknown } = { value: undefined };
  // Each task is "produce a copy of `source` and hand it to `assign`". The
  // closure is what replaces the return value of a recursive call.
  const stack: { source: unknown; assign: (value: unknown) => void }[] = [
    {
      source: doc,
      assign: (value) => {
        root.value = value;
      },
    },
  ];

  while (stack.length) {
    const task = stack.pop();
    if (!task) continue;
    const { source, assign } = task;

    // Primitives — including `null`, which `typeof` calls an object — are
    // immutable, so sharing them with the input is not sharing anything a
    // caller can observe.
    if (typeof source !== 'object' || source === null) {
      assign(source);
      continue;
    }

    const already = copies.get(source);
    if (already !== undefined) {
      assign(already);
      continue;
    }

    if (Array.isArray(source)) {
      const copy: unknown[] = new Array(source.length);
      copies.set(source, copy);
      assign(copy);
      for (let i = 0; i < source.length; i += 1) {
        stack.push({
          source: source[i],
          assign: (value) => {
            copy[i] = value;
          },
        });
      }
      continue;
    }

    const record: Record<string, unknown> = source as Record<string, unknown>;
    const copy: Record<string, unknown> = {};
    copies.set(source, copy);
    assign(copy);

    // Read off the SOURCE, not the half-built copy: the marks decide whether
    // this node's own `text` is rewritten, and they may not have been copied
    // yet — the worklist gives no ordering guarantee between siblings.
    const rewrite =
      record.type === 'text' &&
      record.text === from &&
      marksLinkToNote(record.marks, noteId);
    if (rewrite) changed += 1;

    for (const key of Object.keys(record)) {
      if (rewrite && key === 'text') {
        copy.text = to;
        continue;
      }
      stack.push({
        source: record[key],
        assign: (value) => {
          copy[key] = value;
        },
      });
    }
  }

  // Identity, not a re-serialized equivalent. Callers use `changed === 0` to
  // skip the database write entirely, and `JSON.stringify(JSON.parse(x))`
  // reorders nothing but does normalise whitespace and number formatting — so
  // returning a rebuilt string here would hand every unaffected note a diff
  // that looks like a real edit and cost a write for nothing.
  if (changed === 0) return { content, changed: 0 };

  return { content: JSON.stringify(root.value), changed };
}
