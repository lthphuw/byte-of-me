/**
 * Strip PRESENTATION out of a note that is already stored, keeping structure.
 *
 * `packages/ui/src/rich-text-editor/tiptap/paste-presentation.ts` now does this
 * to a clipboard fragment *before* ProseMirror parses it — read that file for
 * what counts as presentation and why. This is the retrospective half, for the
 * notes pasted into before it existed: `TextStyle` matches any `<span style>`
 * and `Color` reads `element.style.color` off it, so a table copied out of a
 * spreadsheet wrote the source's palette into the document as real marks, and
 * they are still there.
 *
 * It CANNOT be as careful as the paste half, and that asymmetry is the whole
 * caveat. Before the parse there is still a clipboard fragment to judge;
 * afterwards a colour the author picked from the toolbar and a colour the
 * source document supplied are the same mark carrying the same attribute, with
 * nothing stored to tell them apart. So this removes both. The maintenance
 * panel says so before the button is pressed.
 *
 * Mutating the parsed document in place is safe here — unlike
 * `relabelNoteLinks`, which copies — because `JSON.parse` hands back a fresh
 * object graph that nothing else holds a reference to.
 */

/** Cell nodes whose `colwidth` came from a source `<colgroup>`. */
const SIZED_CELL_TYPES = new Set(['tableCell', 'tableHeader']);

export interface StrippedDocument {
  /** The rewritten document — or the input string BY IDENTITY if nothing changed. */
  content: string;
  /** Marks and attributes removed. `0` means: do not write this row. */
  changed: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reset one attribute to `null`, reporting whether it had to.
 *
 * `null` rather than `delete`, because `null` is the extension's own default
 * for every attribute cleared here (`Link.class`, `Highlight.color`, a table
 * cell's `colwidth`), so the result is exactly the document the editor would
 * have produced had the paste never carried the value.
 *
 * `''` counts as already-default and is left alone. Tiptap keeps a parsed
 * attribute unless it is `null`/`undefined`, so a plain `<mark>` stores
 * `color: ''` — and `''` and `null` render identically. Rewriting one to the
 * other is the diff-that-looks-real this file refuses to produce below: it
 * costs a write and an `@updatedAt` bump, and the flat view sorts on
 * `updatedAt`, so it reorders the author's list for a document nobody can see
 * the difference in. `colwidth` cannot reach here — its `parseHTML` yields an
 * int array or `null`, never a string.
 */
function clearAttribute(target: Record<string, unknown>, name: string): number {
  const attrs = target.attrs;
  if (!isRecord(attrs)) return 0;
  const value = attrs[name];
  if (value === null || value === undefined || value === '') return 0;

  attrs[name] = null;
  return 1;
}

/**
 * Remove the presentation a paste could have left in a stored document.
 *
 * Removed:
 * - every `textStyle` mark. This editor registers `TextStyle` only so `Color`
 *   has somewhere to live (no `FontFamily`, no `FontSize`), so the mark carries
 *   nothing but the source's text colour. It often carries no colour at all:
 *   `TextStyle` matches ANY `<span style>` and `Color` stores
 *   `element.style.color` verbatim, so a colourless span is stored as
 *   `color: ''`. Those marks go and are counted like the rest, which is why an
 *   audit that looks for colours reports fewer dirty notes than this rewrites.
 *   That is the opposite of what `clearAttribute` does with `''`, on purpose:
 *   an empty `textStyle` is a mark with no rendered effect at all, and
 *   `stripPastedPresentation` now removes the `style` attribute
 *   `TextStyle.parseHTML` requires, so no new ones arrive and clearing the
 *   stored ones converges instead of restamping the same notes every run.
 * - `highlight`'s `color`, unless it is already `null` or the `''` a plain
 *   `<mark>` parses to. The mark itself stays: `<mark>` is semantic, and
 *   dropping it would lose the fact that a passage was marked at all — the
 *   same line the paste path draws.
 * - `colwidth` on table cells. The table extension is configured
 *   `resizable: false`, so this editor cannot produce one; every value stored is
 *   a column width from somebody else's grid.
 * - `class` on link marks. `Link` is registered unconfigured, so its `class`
 *   default is `null` and anything else came from the source page.
 *
 * Deliberately KEPT: every node type (tables, header rows, cell spans, lists,
 * code blocks, headings), `bold`/`italic`/`strike`/`underline`/`code`, a link's
 * `href`/`target`/`rel`, and `textAlign` — alignment is a first-class toolbar
 * control here, so stripping it would destroy far more authored intent than it
 * could ever recover.
 *
 * Never throws. A document that does not parse is returned untouched with
 * `changed: 0`, the way `extractNoteLinkIds` and `relabelNoteLinks` treat one.
 *
 * The walk is iterative, so a pathologically deep document cannot blow the
 * stack inside a server action. It needs no `seen` guard: `JSON.parse` cannot
 * produce a cycle or a shared reference.
 */
export function stripStoredPresentation(content: string): StrippedDocument {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return { content, changed: 0 };
  }

  let changed = 0;
  const queue: unknown[] = [doc];

  while (queue.length) {
    const node = queue.pop();
    if (!isRecord(node)) continue;

    const marks = node.marks;
    if (Array.isArray(marks)) {
      const kept = marks.filter(
        (mark) => !isRecord(mark) || mark.type !== 'textStyle'
      );
      changed += marks.length - kept.length;

      for (const mark of kept) {
        if (!isRecord(mark)) continue;
        if (mark.type === 'highlight') changed += clearAttribute(mark, 'color');
        if (mark.type === 'link') changed += clearAttribute(mark, 'class');
      }

      // The key is dropped rather than left as `[]`: Tiptap omits `marks`
      // entirely on an unmarked node, and a document this job rewrote should
      // be indistinguishable from one the editor wrote.
      if (kept.length !== marks.length) {
        if (kept.length === 0) delete node.marks;
        else node.marks = kept;
      }
    }

    if (typeof node.type === 'string' && SIZED_CELL_TYPES.has(node.type)) {
      changed += clearAttribute(node, 'colwidth');
    }

    const children = node.content;
    if (Array.isArray(children)) {
      for (const child of children) queue.push(child);
    }
  }

  // Identity, not a re-serialized equivalent, for the reason `relabelNoteLinks`
  // gives: the caller skips the database write on `changed === 0`, and
  // `JSON.stringify(JSON.parse(x))` normalises whitespace and number formatting
  // — so rebuilding here would hand every untouched note a diff that looks real
  // and cost it a write, and an `@updatedAt` bump, for nothing.
  if (changed === 0) return { content, changed: 0 };

  return { content: JSON.stringify(doc), changed };
}
