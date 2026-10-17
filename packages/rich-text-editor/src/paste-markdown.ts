/**
 * When a paste is Markdown source, not text: ProseMirror reads `text/plain` as paragraphs, so
 * `## Title` arrived literally and only inline marks (which have paste rules) converted;
 * headings, lists, tables and fences have none.
 */

/**
 * A line that only block-level Markdown starts with. Inline syntax is left out on purpose: it
 * already converts on paste, and `*` or `_` alone are common in ordinary prose. A lone `---` is
 * left out too: a signature or a divider in plain text says nothing about the rest of it.
 */
const BLOCK_SYNTAX: readonly RegExp[] = [
  /^ {0,3}#{1,6}[ \t]+\S/m, // ATX heading
  /^ {0,3}[-*+][ \t]+\S/m, // bullet or task item
  /^ {0,3}\d{1,9}[.)][ \t]+\S/m, // ordered item
  /^ {0,3}>[ \t]?\S/m, // blockquote
  /^ {0,3}(?:`{3,}|~{3,})/m, // code fence
  // A table's delimiter row: pipes, dashes, colons. The pipe tells it from a thematic break.
  /^ {0,3}\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/m,
];

/**
 * Tags a rendered page puts around real structure. Their presence means the HTML flavour of the
 * clipboard already carries it, and that path (`transformPastedHTML`) keeps it better than a
 * re-parse of the plain text would. VS Code and chat apps send `<div>`/`<span>` only.
 */
const STRUCTURAL_HTML = /<(?:h[1-6]|ul|ol|li|table|pre|blockquote|hr)[\s>/]/i;

/** ProseMirror's own clipboard HTML: a copy from this editor, which keeps its own format. */
const INTERNAL_HTML = /data-pm-slice/;

/** True when the clipboard holds Markdown source that should become blocks. */
export function isMarkdownPaste(text: string, html: string): boolean {
  if (!text.trim()) return false;
  if (INTERNAL_HTML.test(html) || STRUCTURAL_HTML.test(html)) return false;

  return BLOCK_SYNTAX.some((syntax) => syntax.test(text));
}
