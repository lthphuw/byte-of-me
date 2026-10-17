import { SAFE_SCHEMES, schemeOf } from '@byte-of-me/ui-utils';

// Tags allowed to survive sanitization. Everything else is dropped (its text
// content is kept but rendered inert).
const ALLOWED_TAGS = new Set([
  'b',
  'i',
  'em',
  'strong',
  's',
  'u',
  'mark',
  'p',
  'br',
  'hr',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'sup',
  'sub',
  'section',
]);

// Attributes allowed on surviving tags; anything else is dropped (no `on*`, no `style`).
// `id`, `data-*` and `aria-*` carry no script and make anchors work (TOC, citation jumps).
// Keep `scope`: `render-extensions.ts` marks every `th`, and dropping it voids that a11y fix.
const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'class',
  'target',
  'rel',
  'colspan',
  'rowspan',
  'scope',
  'start',
  'type',
  'width',
  'height',
  'id',
  'aria-label',
  'data-citation',
  'data-citation-link',
  'data-reference-list',
  'data-reference-backlink',
  // Which table columns hold figures, worked out at render time by
  // `markNumericTableColumns`. Carries no script — the styles read it to
  // right-align a column of numbers and stop it wrapping.
  'data-numeric',
  // The LaTeX source of a math node, and which flavour it is. Carries no
  // script — it is read back by `MathRenderer`, which hands it to KaTeX with
  // `throwOnError: false`. KaTeX itself is the parser, not this.
  'data-latex',
  'data-type',
  // Image loading hints, kept only with a value from `ENUMERATED_ATTRS`.
  'loading',
  'decoding',
  // A mermaid diagram's natural `WxH`, kept only when it matches `PATTERN_ATTRS`.
  'data-mermaid-size',
]);

// Attributes whose value must come from a closed set; any other value drops
// the attribute rather than passing arbitrary text through.
const ENUMERATED_ATTRS: Record<string, ReadonlySet<string>> = {
  loading: new Set(['lazy', 'eager']),
  decoding: new Set(['async', 'sync', 'auto']),
};

// Attributes whose value must match a fixed shape. The shape is the whole check: a
// layout hint that is not a plain number pair is dropped, never passed through.
const PATTERN_ATTRS: Record<string, RegExp> = {
  'data-mermaid-size': /^\d{1,5}x\d{1,5}$/,
};

const VOID_TAGS = new Set(['br', 'hr', 'img']);

// One tag, with a quoted attribute value read whole so a `>` inside `alt="a -> b"`
// does not end it (a browser reads it the same way). A `<` that opens no
// complete tag matches alone and becomes text.
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>|</g;

const REPLACEMENT_CHAR = '\uFFFD';

/**
 * The code point a browser resolves a numeric character reference to. Leading zeros are trimmed
 * before the length check (`&#00000106;` is `j`); zero, surrogates and out-of-range or overlong
 * values become U+FFFD.
 */
function decodeNumericReference(digits: string, radix: 10 | 16): string {
  const significant = digits.replace(/^0+/, '');
  // Eight hex digits already exceed 0x10FFFF; checking the length first keeps
  // an absurdly long run from being parsed to a lossy float.
  if (significant.length === 0 || significant.length > 8) {
    return REPLACEMENT_CHAR;
  }

  const code = Number.parseInt(significant, radix);
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return REPLACEMENT_CHAR;
  }

  return String.fromCodePoint(code);
}

// Named references that decode to something a scheme check cares about. Any
// other name is left as written (a browser leaves unknown names literal too).
const NAMED_REFERENCES: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
};

/**
 * Decode the HTML entities a browser resolves in an attribute value: `&#106;avascript:` reads as
 * a relative URL here but is `javascript:` to the browser. One pass, so `&#38;#106;` decodes
 * once to the literal `&#106;`, as in a browser.
 */
function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z][a-z0-9]*));?/gi,
    (whole, hex?: string, dec?: string, name?: string) => {
      if (hex !== undefined) return decodeNumericReference(hex, 16);
      if (dec !== undefined) return decodeNumericReference(dec, 10);
      return NAMED_REFERENCES[(name ?? '').toLowerCase()] ?? whole;
    }
  );
}

/**
 * True when a browser would resolve this URL outside `SAFE_SCHEMES`. Entities are decoded and
 * controls stripped first, as browsers do (`java&#09;script:` runs). Fails closed: an entity
 * this decoder cannot read before the first colon is unsafe; a colon after `/`, `?`, `#` is a path.
 */
function isUnsafeUrl(value: string): boolean {
  // Strip C0 controls, space and NBSP, all ignored inside a scheme (`java<TAB>script:` runs).
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\u0000-\u0020\u00a0]/g;
  const normalized = decodeEntities(value).replace(controlChars, '');

  const scheme = schemeOf(normalized);
  if (scheme) return !SAFE_SCHEMES.has(scheme);

  const colon = normalized.indexOf(':');
  if (colon !== -1) {
    const beforeColon = normalized.slice(0, colon);
    const isPath = /[/?#]/.test(beforeColon);
    if (!isPath && /[&\uFFFD]/.test(beforeColon)) return true;
  }

  // No scheme at all means a relative path or a fragment — nothing to abuse.
  return false;
}

/**
 * Escape a string so it renders as literal text inside HTML. Use for any
 * untrusted value interpolated into an HTML context (e.g. notification emails)
 * or when content is not known-safe markup.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allowlist HTML sanitizer: rebuilds each allowlisted tag from an attribute allowlist (no event
 * handlers or style, however separated) and rewrites href/src outside `SAFE_SCHEMES` to `#`.
 * Rebuilding beats stripping, which misses attribute-separator bypasses. Escape free-form text.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Drop script/style/iframe/object/embed blocks along with their content.
  let clean = html.replace(
    /<(script|style|iframe|object|embed|noscript)\b[\s\S]*?<\/\1\s*>/gim,
    ''
  );

  clean = clean.replace(TAG, (tag) => {
    if (tag === '<') return '&lt;';

    const match = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
    if (!match) return '';

    const isClosing = match[1] === '/';
    const name = match[2].toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return '';
    if (isClosing) return `</${name}>`;

    const attrs: string[] = [];
    const attrRe =
      /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s/>]+)/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(tag)) !== null) {
      const attrName = attr[1].toLowerCase();
      if (!ALLOWED_ATTRS.has(attrName)) continue;

      let value = attr[2].replace(/^["']|["']$/g, '');
      const allowedValues = ENUMERATED_ATTRS[attrName];
      if (allowedValues && !allowedValues.has(value.toLowerCase())) continue;
      const pattern = PATTERN_ATTRS[attrName];
      if (pattern && !pattern.test(value)) continue;
      if ((attrName === 'href' || attrName === 'src') && isUnsafeUrl(value)) {
        value = '#';
      }
      // `<` and `>` are escaped so the output stays one well-formed tag and
      // survives a second pass through this function unchanged.
      const escaped = value
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      attrs.push(`${attrName}="${escaped}"`);
    }

    const rendered = attrs.length ? `<${name} ${attrs.join(' ')}` : `<${name}`;
    return VOID_TAGS.has(name) ? `${rendered} />` : `${rendered}>`;
  });

  return clean.trim();
}
