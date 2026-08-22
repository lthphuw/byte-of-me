import { createReferenceId, type ReferenceItem } from './types';

/**
 * A BibTeX reader, scoped to exactly what the bibliography can show.
 *
 * Deliberately hand-written rather than a dependency: the five fields a
 * `ReferenceItem` has are a tiny target, the entries authors actually paste
 * come from arXiv, ACM and Google Scholar, and a full BibTeX implementation
 * (string macros, cross-references, `.bst` styles) would be an order of
 * magnitude more code than the thing it feeds.
 *
 * The rule throughout is to salvage rather than reject: a paste with one
 * malformed entry still imports the others, and a truncated final entry still
 * yields whatever fields were complete.
 */

/** An entry that could not become a reference, and why. */
export type SkippedBibtexEntry = { key: string; reason: string };

export type BibtexParseResult = {
  entries: ReferenceItem[];
  skipped: SkippedBibtexEntry[];
};

/** Entry types that carry no bibliography record. */
const NON_ENTRY_TYPES = new Set(['comment', 'string', 'preamble']);

/** Checked in order — the first one present becomes `source`. */
const SOURCE_FIELDS = [
  'journal',
  'journaltitle',
  'booktitle',
  'publisher',
  'school',
  'institution',
  'organization',
  'howpublished',
];

/**
 * Schemes a reference URL may carry. The same allowlist `lib/sanitize.ts`
 * enforces at render time — applied here too so an author never saves a field
 * that will silently vanish from the published page.
 */
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * LaTeX accent commands, as the combining mark they stand for. Composing the
 * letter with a combining mark and normalizing beats a lookup table of every
 * letter/accent pair: `\H{o}` and `\H{u}` fall out of the same three lines.
 */
const ACCENTS: Record<string, string> = {
  '`': '̀', // grave
  "'": '́', // acute
  '^': '̂', // circumflex
  '"': '̈', // diaeresis
  '~': '̃', // tilde
  '=': '̄', // macron
  '.': '̇', // dot above
  H: '̋', // double acute
  v: '̌', // caron
  u: '̆', // breve
  c: '̧', // cedilla
  k: '̨', // ogonek
  d: '̣', // dot below
  b: '̱', // macron below
  r: '̊', // ring above
};

/**
 * Accents whose letter may follow without braces (`\"o`).
 *
 * The letter-named commands are deliberately excluded from the brace-free
 * form: `\Huge` and `\vspace` start with an accent command's name, and
 * treating them as one would turn them into mojibake. They still work in
 * their braced form, which is how they are written in practice.
 */
const BARE_ACCENTS = '`\'^"~=.';

const ESCAPED_SPECIALS: Record<string, string> = {
  '&': '&',
  '%': '%',
  $: '$',
  '#': '#',
  _: '_',
};

// Stand-ins for braces the author escaped, so the pass that strips BibTeX's
// own grouping braces cannot eat them.
const LITERAL_OPEN = '\u0001';
const LITERAL_CLOSE = '\u0002';

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ACCENT_NAMES = Object.keys(ACCENTS).map(escapeForRegExp).join('|');
const BRACED_ACCENT = new RegExp(
  `\\\\(${ACCENT_NAMES})\\s*\\{\\s*([A-Za-z])\\s*\\}`,
  'g'
);
const BARE_ACCENT = new RegExp(
  `\\\\([${escapeForRegExp(BARE_ACCENTS)}])\\s*([A-Za-z])`,
  'g'
);

/**
 * Turns a raw BibTeX value into the text a reader should see: accents
 * resolved, escapes unescaped, grouping braces gone, whitespace collapsed.
 */
function readLatex(raw: string): string {
  let text = raw
    .replace(/\\\{/g, LITERAL_OPEN)
    .replace(/\\\}/g, LITERAL_CLOSE);

  text = text
    .replace(BRACED_ACCENT, (_, command: string, letter: string) => {
      return letter + ACCENTS[command];
    })
    .replace(BARE_ACCENT, (_, command: string, letter: string) => {
      return letter + ACCENTS[command];
    });

  text = text.replace(
    /\\([&%$#_])/g,
    (_, character: string) => ESCAPED_SPECIALS[character]
  );

  // Whatever markup is left (`\emph`, `\url`, `\textbf`) is styling this
  // bibliography does not render. Drop the command, keep its argument — the
  // brace strip below unwraps what it was holding.
  text = text.replace(/\\[a-zA-Z]+\s*/g, '');

  text = text
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    // A bare tilde is BibTeX's non-breaking space.
    .replace(/~/g, ' ')
    .replace(/[{}]/g, '')
    .replace(new RegExp(LITERAL_OPEN, 'g'), '{')
    .replace(new RegExp(LITERAL_CLOSE, 'g'), '}');

  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Index of the brace that closes the one at `open`, or `input.length` when the
 * text is truncated — the caller reads what it can rather than dropping it.
 */
function findClosing(input: string, open: number): number {
  const closer = input[open] === '(' ? ')' : '}';
  const opener = input[open];
  let depth = 0;

  for (let i = open; i < input.length; i += 1) {
    const character = input[i];
    if (character === '\\') {
      i += 1;
      continue;
    }
    if (character === opener) depth += 1;
    else if (character === closer) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return input.length;
}

/** Splits on `separator`, ignoring any occurrence nested inside braces. */
function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < input.length; i += 1) {
    const character = input[i];
    if (character === '\\') {
      i += 1;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') depth -= 1;
    else if (depth === 0 && character === separator) {
      parts.push(input.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(input.slice(start));
  return parts;
}

/** Splits a BibTeX author list on its ` and ` separators, braces respected. */
function splitAuthorList(input: string): string[] {
  const names: string[] = [];
  const pattern = /\s+and\s+/gi;
  let depth = 0;
  let start = 0;

  for (let i = 0; i < input.length; i += 1) {
    const character = input[i];
    if (character === '\\') {
      i += 1;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') depth -= 1;
    else if (depth === 0) {
      pattern.lastIndex = i;
      const match = pattern.exec(input);
      if (match && match.index === i) {
        names.push(input.slice(start, i));
        i = pattern.lastIndex - 1;
        start = pattern.lastIndex;
      }
    }
  }

  names.push(input.slice(start));
  return names.map((name) => name.trim()).filter(Boolean);
}

/** `Ren, Shaoqing` reads as `Shaoqing Ren`; anything else is left alone. */
function readName(raw: string): string {
  const name = readLatex(raw);
  if (name.toLowerCase() === 'others') return 'et al.';

  const parts = splitTopLevel(raw, ',').map((part) => readLatex(part));
  if (parts.length !== 2 || !parts[0] || !parts[1]) return name;

  return `${parts[1]} ${parts[0]}`;
}

/** The `name = value` pairs of one entry body, field names lower-cased. */
function readFields(body: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const chunk of splitTopLevel(body, ',')) {
    const equals = chunk.indexOf('=');
    if (equals === -1) continue;

    const name = chunk.slice(0, equals).trim().toLowerCase();
    if (!name || fields.has(name)) continue;

    const rest = chunk.slice(equals + 1).trim();
    if (!rest) continue;

    if (rest.startsWith('{')) {
      fields.set(name, rest.slice(1, findClosing(rest, 0)));
    } else if (rest.startsWith('"')) {
      const end = rest.indexOf('"', 1);
      fields.set(name, rest.slice(1, end === -1 ? undefined : end));
    } else {
      fields.set(name, rest);
    }
  }

  return fields;
}

/** An id that can sit in a URL fragment, derived from the citation key. */
function readKey(raw: string): string {
  return raw
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function readUrl(fields: Map<string, string>): string | undefined {
  const explicit = fields.get('url') ?? fields.get('howpublished');
  const doi = fields.get('doi');
  const eprint = fields.get('eprint');

  let candidate = explicit ? readLatex(explicit) : '';

  if (!candidate && doi) {
    const value = readLatex(doi);
    candidate = /^https?:/i.test(value) ? value : `https://doi.org/${value}`;
  }

  if (!candidate && eprint) {
    const archive = readLatex(fields.get('archiveprefix') ?? 'arXiv');
    const value = readLatex(eprint);
    if (/arxiv/i.test(archive)) candidate = `https://arxiv.org/abs/${value}`;
  }

  if (!candidate) return undefined;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(candidate);
  // No scheme at all is the common `arxiv.org/abs/…` paste, not an attack.
  if (!scheme) return `https://${candidate}`;

  return SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? candidate : undefined;
}

function readEntry(
  type: string,
  body: string,
  usedIds: Set<string>
): ReferenceItem | SkippedBibtexEntry {
  const [rawKey, ...rest] = splitTopLevel(body, ',');
  const key = rawKey.trim();
  const fields = readFields(rest.join(','));

  const title = readLatex(fields.get('title') ?? '');
  if (!title) return { key: key || `@${type}`, reason: 'no title' };

  const authorList = fields.get('author') ?? fields.get('editor');
  const authors = authorList
    ? splitAuthorList(authorList).map(readName).filter(Boolean).join(', ')
    : '';

  const sourceField = SOURCE_FIELDS.find((name) => fields.has(name));
  // `howpublished` doubles as the URL for a `@misc`; if that is all it holds,
  // it is a link, not a source, and `readUrl` has already claimed it.
  const source =
    sourceField && !(sourceField === 'howpublished' && !fields.has('url'))
      ? readLatex(fields.get(sourceField) ?? '')
      : '';

  const year =
    readLatex(fields.get('year') ?? '').match(/\d{4}/)?.[0] ??
    readLatex(fields.get('date') ?? '').match(/\d{4}/)?.[0] ??
    '';

  let id = readKey(key) || createReferenceId();
  if (usedIds.has(id)) {
    let suffix = 2;
    while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
    id = `${id}-${suffix}`;
  }
  usedIds.add(id);

  return {
    id,
    title,
    authors: authors || undefined,
    source: source || undefined,
    year: year || undefined,
    url: readUrl(fields),
  };
}

/**
 * Reads every `@type{key, …}` record in `input`.
 *
 * Entries keep their citation key as the reference id, so a bibliography
 * anchor reads `#ref-faster-rcnn` and re-pasting the same `.bib` updates the
 * entries it already contributed instead of duplicating them.
 */
export function parseBibtex(input: string): BibtexParseResult {
  const entries: ReferenceItem[] = [];
  const skipped: SkippedBibtexEntry[] = [];
  const usedIds = new Set<string>();

  let cursor = 0;

  while (cursor < input.length) {
    const at = input.indexOf('@', cursor);
    if (at === -1) break;

    let scan = at + 1;
    while (scan < input.length && /[A-Za-z]/.test(input[scan])) scan += 1;
    const type = input.slice(at + 1, scan).toLowerCase();

    while (scan < input.length && /\s/.test(input[scan])) scan += 1;

    if (!type || (input[scan] !== '{' && input[scan] !== '(')) {
      cursor = at + 1;
      continue;
    }

    const closing = findClosing(input, scan);
    const body = input.slice(scan + 1, closing);
    cursor = closing + 1;

    if (NON_ENTRY_TYPES.has(type)) continue;

    const result = readEntry(type, body, usedIds);
    if ('reason' in result) skipped.push(result);
    else entries.push(result);
  }

  return { entries, skipped };
}
