/**
 * Reading the LABELS on note links, as opposed to the targets `note-links.ts`
 * extracts.
 *
 * A note link is an ordinary Tiptap link mark whose href is the target's route,
 * so it survives a rename — that is the failure mode `[[Wiki Title]]` syntax
 * has and this format does not. What does not survive is the anchor's visible
 * text: the author wrote "Kafka rebalancing" when they inserted the link, the
 * target has since been renamed to "Consumer group rebalancing", and the
 * sentence still says the old thing.
 *
 * WHY THIS ONLY EVER REPORTS. A label that differs from its target's current
 * title has two indistinguishable causes: the target was renamed, or the author
 * deliberately wrote their own words — "as discussed earlier", "the same
 * problem", "this". Nothing is stored that tells the two apart; the document
 * holds the text and the href and no record of where the text came from. So a
 * whole-vault sweep that "fixed" every mismatch would rewrite real prose into
 * titles, mid-sentence, across the entire corpus, and there is no undo for
 * that. Renaming a note CAN relabel automatically because there the old title
 * is known — a label equal to it was a link label, and one that is not was
 * prose. A retrospective sweep has no such evidence and must not pretend to.
 *
 * The output is therefore a list a human reads and acts on one row at a time.
 */
import { parseNoteHref } from './note-links';

/** One anchor whose label no longer matches the title of what it points at. */
export interface StaleNoteLink {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  /** The anchor's visible text, as written in the document. */
  label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The note id a node's link mark points at, or `null` if it has none. */
function noteLinkIdOf(node: unknown): string | null {
  if (!isRecord(node) || !Array.isArray(node.marks)) return null;

  for (const mark of node.marks) {
    if (!isRecord(mark) || mark.type !== 'link') continue;
    const attrs = mark.attrs;
    if (!isRecord(attrs) || typeof attrs.href !== 'string') continue;

    const id = parseNoteHref(attrs.href);
    if (id) return id;
  }

  return null;
}

function textOf(node: unknown): string {
  if (!isRecord(node) || typeof node.text !== 'string') return '';
  return node.text;
}

/**
 * Every note-link anchor in a document: what it points at, and what it says.
 *
 * ANCHORS, not text nodes. Tiptap splits a run wherever the mark set changes,
 * so "as **discussed** earlier" carrying one link is three text nodes sharing
 * one href — and reported per node it would surface three stale labels for a
 * single anchor, none of which is the text the author sees. Consecutive
 * siblings pointing at the same note are therefore merged into one entry, and
 * a non-link sibling between two anchors to the same note ends the run, because
 * that is two anchors.
 *
 * Duplicates are kept. Two anchors to the same note with different words are
 * two findings, and even two with the same words are two places to edit; the
 * caller decides what to collapse. Empty text is kept too, for the same reason:
 * whether an invisible anchor is worth reporting is the report's policy, not
 * the parser's.
 *
 * Iterative, with a `seen` set over visited objects, for the reason
 * `extractNoteLinkIds` records: a document is author-controlled data that has
 * already round-tripped through the database, and a cyclic or pathologically
 * deep one must not be able to blow the stack inside a server action.
 * Malformed JSON returns `[]` rather than throwing — a document that does not
 * parse has no labels to audit, and the save that produced it is the thing that
 * would be wrong.
 */
export function collectNoteLinkLabels(
  content: string
): Array<{ noteId: string; text: string }> {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return [];
  }

  const labels: Array<{ noteId: string; text: string }> = [];
  const seen = new Set<unknown>();
  const stack: unknown[] = [doc];

  while (stack.length) {
    const node = stack.pop();
    if (!isRecord(node) || seen.has(node)) continue;
    seen.add(node);

    const children = node.content;
    if (!Array.isArray(children)) continue;

    // A node's children are scanned as a sequence rather than pushed and
    // visited one by one, because adjacency is the information the merge above
    // depends on and the stack does not preserve it.
    let runId: string | null = null;
    let runText = '';

    for (const child of children) {
      const id = noteLinkIdOf(child);

      if (id !== null && id === runId) {
        runText += textOf(child);
      } else {
        if (runId !== null) labels.push({ noteId: runId, text: runText });
        runId = id;
        runText = id === null ? '' : textOf(child);
      }
    }
    if (runId !== null) labels.push({ noteId: runId, text: runText });

    // Pushed in reverse AFTER the scan so `pop()` visits them left to right,
    // which is what makes the whole walk pre-order and the result document
    // order rather than incidental order.
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }

  return labels;
}
