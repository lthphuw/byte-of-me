/**
 * Tidies markdown SOURCE without changing what it means.
 *
 * The editor stores a Tiptap document, not text — markdown is a view of it, and
 * the serializer's own output is already close to canonical (measured on a real
 * note: no trailing whitespace, no tabs, no runs of blank lines, `-` bullets
 * throughout). So this is not for what the app writes. It is for what an author
 * PASTES into the raw-markdown pane: a README, a chat answer, half a wiki page
 * — the messy input that arrives with tabs, four blank lines between sections,
 * `*` and `+` bullets in the same list and `#Heading` with no space.
 *
 * The contract is deliberately narrow, because a formatter that silently loses
 * a line is worse than no formatter at all:
 *
 *   - It only ever rewrites WHITESPACE and MARKER CHARACTERS.
 *   - It never reorders, never renumbers, never rewraps a paragraph, and never
 *     deletes a line that had content on it.
 *   - Anything it does not positively recognise is copied through verbatim.
 *
 * Two constructs are passed through untouched as whole regions rather than
 * merely "not recognised": fenced code (where a tab is data) and YAML front
 * matter (where trimming is safe but the `-` rules are not). Indented code
 * blocks get the same treatment via {@link isIndentedCode}.
 */

/** One source line, plus whether the walk is allowed to rewrite it. */
interface Line {
  text: string;
  /** True inside fenced code, front matter, or an indented code block. */
  verbatim: boolean;
}

/** ` ``` ` or `~~~`, with an optional info string. */
const FENCE = /^(\s*)(`{3,}|~{3,})\s*(.*)$/;

/**
 * `#`–`######`, however badly spaced, with an optional closing run of `#`.
 *
 * `(?!#)` is what stops a SEVENTH hash from being read as a six-hash heading
 * followed by the text `#Title`. Seven hashes are not a heading in any dialect,
 * and rewriting them to `###### #Title` would have invented one.
 *
 * Note that `#Title` (no space) IS accepted, and CommonMark says it is a
 * paragraph. That is the one place this module knowingly changes what a
 * document means, because an author who typed `#Title` meant a heading — it is
 * the single most common markdown typo and fixing it is the point.
 */
const ATX_HEADING = /^(\s*)(#{1,6})(?!#)[ \t]*(.*?)[ \t]*#*[ \t]*$/;

/** A bullet. The space after the marker is what separates it from `*emphasis*`. */
const BULLET = /^(\s*)([*+-])([ \t]+)(.*)$/;

/** `1.` / `1)`, any amount of space after. Never renumbered — see the header. */
const ORDERED = /^(\s*)(\d{1,9})([.)])([ \t]+)(.*)$/;

/** `---`, `***`, `___`, `- - -`, … — three or more of one char, spaces allowed. */
const THEMATIC_BREAK = /^ {0,3}(?:([-*_])[ \t]*)(?:\1[ \t]*){2,}$/;

/** A quote line, however many levels deep. */
const BLOCKQUOTE = /^(\s*)((?:>[ \t]*)+)(.*)$/;

/** A line that could belong to a table. */
const TABLE_ROW = /^\s*\|.*$/;

/** `---`, `:--`, `--:`, `:-:` — one cell of a table's delimiter row. */
const DELIMITER_CELL = /^:?-{1,}:?$/;

/**
 * CommonMark counts a tab as advancing to the next multiple of four, so leading
 * tabs have to expand against a running column rather than to a fixed width —
 * `\t\t` is 8 spaces, but `  \t` is only 4.
 */
function expandLeadingTabs(text: string): string {
  const indent = /^[ \t]*/.exec(text)?.[0] ?? '';
  if (!indent.includes('\t')) return text;

  let out = '';
  let column = 0;

  for (const char of indent) {
    if (char === '\t') {
      const width = 4 - (column % 4);
      out += ' '.repeat(width);
      column += width;
    } else {
      out += ' ';
      column += 1;
    }
  }

  // Only the indent is expanded here; tabs in the body are the interior pass's
  // problem, and are worth one space rather than a column stop.
  return out + text.slice(indent.length);
}

/**
 * Indentation only, as a count of columns after tab expansion. Used to spot
 * indented code blocks without rewriting the line first.
 */
function indentWidth(text: string): number {
  let column = 0;
  for (const char of text) {
    if (char === '\t') column += 4 - (column % 4);
    else if (char === ' ') column += 1;
    else break;
  }
  return column;
}

/**
 * An indented code block, approximately.
 *
 * Four columns of indent where the previous line is blank or was itself code.
 * It is an approximation — a deeply nested list's continuation paragraph can
 * reach four columns too — and it is wrong in the harmless direction: a false
 * positive means a line is left exactly as the author wrote it, which is the
 * default this whole module falls back to anyway.
 */
function isIndentedCode(text: string, previousBlank: boolean, previousCode: boolean): boolean {
  if (text.trim() === '') return false;
  if (indentWidth(text) < 4) return false;
  return previousBlank || previousCode;
}

/**
 * Trailing whitespace, minus the two-space hard break.
 *
 * Two or more trailing spaces are a `<br>` in every markdown dialect — invisible
 * in the pane, and load-bearing. Trimming them would be the one change here that
 * alters the rendered document, so a line that had them keeps exactly two.
 */
function trimEnd(text: string): string {
  const body = text.replace(/[ \t]+$/, '');
  if (body === '') return '';
  const trailing = text.slice(body.length);
  const spaces = trailing.replace(/\t/g, '  ');
  return spaces.length >= 2 ? `${body}  ` : body;
}

/** Interior runs of tabs and spaces, outside code. Never touches the indent. */
function collapseInteriorWhitespace(indent: string, body: string): string {
  return indent + body.replace(/\t/g, ' ').replace(/(\S)[ ]{2,}(?=\S)/g, '$1 ');
}

/** Rewrites one ordinary line. Never returns `''` for a line that had content. */
function formatLine(raw: string, previousBlank: boolean): string {
  const expanded = expandLeadingTabs(raw);

  if (expanded.trim() === '') return '';

  // Checked before the bullet rule: `* * *` and `- - -` are rules, not lists.
  //
  // `previousBlank` is not decoration. A thematic break directly under a
  // paragraph is a break, but `---` directly under a paragraph is a SETEXT
  // HEADING — so rewriting `***` to `---` in that position would silently
  // promote the paragraph above it to an `<h2>`. In that one position the
  // line is left exactly as written.
  if (THEMATIC_BREAK.test(expanded)) return previousBlank ? '---' : expanded.trimEnd();

  const quote = BLOCKQUOTE.exec(expanded);
  if (quote) {
    const [, indent, markers, rest] = quote;
    // `>>text` → `> > text`: one space after each marker, and the quoted line
    // recursively gets the same treatment as any other. The recursion cannot
    // run away — the marker group is greedy, so `rest` never starts with `>`.
    const depth = (markers.match(/>/g) ?? []).length;
    const prefix = '> '.repeat(depth);
    const inner = formatLine(rest, previousBlank);
    return trimEnd(inner === '' ? `${indent}${prefix.trimEnd()}` : `${indent}${prefix}${inner}`);
  }

  const heading = ATX_HEADING.exec(expanded);
  if (heading) {
    const [, indent, hashes, text] = heading;
    if (text === '') return `${indent}${hashes}`;
    return trimEnd(collapseInteriorWhitespace(`${indent}${hashes} `, text));
  }

  const bullet = BULLET.exec(expanded);
  if (bullet) {
    const [, indent, , , rest] = bullet;
    // `*` and `+` become `-`. Not a matter of taste: a list that switches
    // marker mid-way is TWO lists to a markdown parser, which is the single
    // most common way a pasted list comes apart.
    return trimEnd(collapseInteriorWhitespace(`${indent}- `, rest));
  }

  const ordered = ORDERED.exec(expanded);
  if (ordered) {
    const [, indent, number, delimiter, , rest] = ordered;
    // The NUMBER is left exactly as written. Renumbering is the one "tidy" a
    // markdown formatter can do that changes a document an author may have
    // meant (an all-`1.` list is a documented style), and this module does not
    // change documents.
    return trimEnd(collapseInteriorWhitespace(`${indent}${number}${delimiter} `, rest));
  }

  const indent = expanded.slice(0, expanded.length - expanded.trimStart().length);
  return trimEnd(collapseInteriorWhitespace(indent, expanded.trimStart()));
}

/** Splits a table row into trimmed cells, respecting `\|` escapes. */
function tableCells(row: string): string[] {
  const body = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '\\' && body[i + 1] === '|') {
      current += '\\|';
      i += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

type Alignment = 'left' | 'right' | 'center' | 'none';

function alignmentOf(cell: string): Alignment {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return 'none';
}

function delimiterCell(width: number, alignment: Alignment): string {
  const inner = Math.max(width, 3);
  switch (alignment) {
    case 'center':
      return `:${'-'.repeat(inner - 2)}:`;
    case 'right':
      return `${'-'.repeat(inner - 1)}:`;
    case 'left':
      return `:${'-'.repeat(inner - 1)}`;
    default:
      return '-'.repeat(inner);
  }
}

/**
 * Re-pads one table so its pipes line up in the pane.
 *
 * Returns `null` — meaning "leave every line alone" — unless the second row is
 * a real delimiter row with the same number of cells as the header. A run of
 * lines that merely start with `|` is not a table, and guessing would turn a
 * quoted snippet into one.
 *
 * Column widths use `String.length`. That undercounts nothing in Latin or
 * Vietnamese text but does undercount CJK, whose glyphs are double-width in a
 * monospace font — such a table comes out valid and readable, just not
 * perfectly flush.
 */
function formatTable(rows: string[]): string[] | null {
  if (rows.length < 2) return null;

  // A table nested in a list keeps its indent, which is the only thing holding
  // it inside that list.
  const indent = /^\s*/.exec(rows[0])?.[0] ?? '';
  const grid = rows.map(tableCells);
  const header = grid[0];
  const delimiter = grid[1];

  if (delimiter.length !== header.length) return null;
  if (!delimiter.every((cell) => DELIMITER_CELL.test(cell))) return null;

  const alignments = delimiter.map(alignmentOf);
  const columns = header.length;
  const widths = Array.from({ length: columns }, (_, column) =>
    grid.reduce(
      (widest, row, index) =>
        index === 1 ? widest : Math.max(widest, row[column]?.length ?? 0),
      3
    )
  );

  return grid.map((row, index) => {
    if (index === 1) {
      const cells = alignments.map((a, c) => delimiterCell(widths[c], a));
      return `${indent}| ${cells.join(' | ')} |`;
    }
    const cells = Array.from({ length: columns }, (_, column) =>
      (row[column] ?? '').padEnd(widths[column])
    );
    return `${indent}| ${cells.join(' | ')} |`;
  });
}

/**
 * Splits the source into regions the walk may rewrite and regions it may not.
 *
 * Fence tracking is by DELIMITER, not just by count: a ` ``` ` never closes a
 * `~~~` block, and a closing fence must be at least as long as the one that
 * opened it — which is how a markdown document containing markdown code fences
 * survives this at all.
 */
function classify(source: string): Line[] {
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n');
  const lines: Line[] = [];

  let fence: { char: string; length: number } | null = null;
  let inFrontMatter = false;
  let previousBlank = true;
  let previousCode = false;

  for (const [index, text] of rawLines.entries()) {
    // YAML front matter, and only at the very top of the document.
    if (index === 0 && /^---\s*$/.test(text)) {
      inFrontMatter = true;
      lines.push({ text: text.trimEnd(), verbatim: true });
      continue;
    }
    if (inFrontMatter) {
      if (/^(---|\.\.\.)\s*$/.test(text)) inFrontMatter = false;
      lines.push({ text: text.trimEnd(), verbatim: true });
      continue;
    }

    const fenceMatch = FENCE.exec(text);

    if (fence) {
      const closes =
        fenceMatch !== null &&
        fenceMatch[2][0] === fence.char &&
        fenceMatch[2].length >= fence.length &&
        fenceMatch[3] === '';

      if (closes) {
        // Only the fence line itself is tidied — the indent is kept, because
        // inside a list a fence's indent is what keeps it in the list.
        lines.push({ text: `${fenceMatch[1]}${fenceMatch[2]}`, verbatim: true });
        fence = null;
      } else {
        lines.push({ text, verbatim: true });
      }
      previousBlank = false;
      previousCode = false;
      continue;
    }

    if (fenceMatch) {
      fence = { char: fenceMatch[2][0], length: fenceMatch[2].length };
      const info = fenceMatch[3].trim();
      lines.push({
        text: `${fenceMatch[1]}${fenceMatch[2]}${info}`,
        verbatim: true,
      });
      previousBlank = false;
      previousCode = false;
      continue;
    }

    const code = isIndentedCode(text, previousBlank, previousCode);
    lines.push({ text: code ? text.replace(/[ \t]+$/, '') : text, verbatim: code });

    previousBlank = text.trim() === '';
    previousCode = code;
  }

  return lines;
}

/**
 * Tidied markdown. Idempotent: formatting an already-formatted document returns
 * it unchanged, which is what lets a caller compare the two and tell the author
 * there was nothing to do.
 */
export function formatMarkdown(source: string): string {
  const classified = classify(source);
  const formatted: Line[] = [];

  for (const [index, line] of classified.entries()) {
    if (line.verbatim) {
      formatted.push(line);
      continue;
    }
    // What the PREVIOUS source line was, not the previous output line: the
    // thematic-break rule needs to know whether this line sits directly under
    // a paragraph, and collapsing blank runs happens later.
    const previous = classified[index - 1];
    const previousBlank =
      previous === undefined || (!previous.verbatim && previous.text.trim() === '');
    formatted.push({ text: formatLine(line.text, previousBlank), verbatim: false });
  }

  const out: string[] = [];

  for (let i = 0; i < formatted.length; i += 1) {
    const line = formatted[i];

    if (line.verbatim) {
      out.push(line.text);
      continue;
    }

    // Runs of blank lines collapse to one. A single blank line is the only
    // block separator markdown has; more than one is never meaningful outside
    // code, and it is the single biggest source of "why is there a hole here".
    if (line.text === '') {
      if (out.length === 0) continue;
      if (out[out.length - 1] === '') continue;
      out.push('');
      continue;
    }

    // Gather a table candidate: consecutive rewritable lines starting with `|`.
    if (TABLE_ROW.test(line.text)) {
      const run: string[] = [];
      let cursor = i;
      while (
        cursor < formatted.length &&
        !formatted[cursor].verbatim &&
        TABLE_ROW.test(formatted[cursor].text)
      ) {
        run.push(formatted[cursor].text);
        cursor += 1;
      }

      const table = formatTable(run);
      out.push(...(table ?? run));
      i = cursor - 1;
      continue;
    }

    out.push(line.text);
  }

  // Trailing blank lines go; exactly one newline terminates the file. An empty
  // document stays empty rather than becoming a lone newline.
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.length === 0 ? '' : `${out.join('\n')}\n`;
}
