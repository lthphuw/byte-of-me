// Tags allowed to survive sanitization. Everything else is dropped (its text
// content is kept but rendered inert).
const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 's', 'u', 'mark', 'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code',
  'pre', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr',
  'th', 'td', 'sup', 'sub', 'section',
]);

// Attributes allowed on surviving tags. Notably excludes all `on*` event
// handlers and `style`. Anything not listed is dropped.
//
// `id` and the `data-*`/`aria-*` entries below carry no script and are what
// make in-page anchors work: heading ids for the table of contents, and the
// citation/reference pairs that let a reader jump to a source and back.
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'colspan',
  'rowspan', 'start', 'type', 'width', 'height', 'id', 'aria-label',
  'data-citation', 'data-citation-link', 'data-reference-list',
  'data-reference-backlink',
  // Which table columns hold figures, worked out at render time by
  // `markNumericTableColumns`. Carries no script — the styles read it to
  // right-align a column of numbers and stop it wrapping.
  'data-numeric',
  // The LaTeX source of a math node, and which flavour it is. Carries no
  // script — it is read back by `MathRenderer`, which hands it to KaTeX with
  // `throwOnError: false`. KaTeX itself is the parser, not this.
  'data-latex', 'data-type',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

// Schemes a link or image may use. This is an allowlist rather than a list of
// known-bad schemes: a denylist has to anticipate every dangerous scheme, while
// an allowlist fails closed on the ones nobody thought of.
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Decode the HTML entities a browser resolves inside an attribute value.
 * Without this, `&#106;avascript:` reads as an ordinary relative URL here but
 * becomes `javascript:` by the time the browser resolves it.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]{1,6});?/gi, (whole, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    })
    .replace(/&#(\d{1,7});?/g, (whole, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    })
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n');
}

/**
 * True when a browser would resolve this URL to something outside
 * `SAFE_SCHEMES`. Entities are decoded and control characters stripped first,
 * because browsers do both before looking at the scheme — `java&#09;script:`
 * and `java<TAB>script:` are both executable.
 */
function isUnsafeUrl(value: string): boolean {
  // Strip C0 controls, space and NBSP — all ignored inside a scheme.
  // Matching control characters is the whole point: `java<TAB>script:`
  // is executable once the browser normalizes it.
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\u0000-\u0020\u00a0]/g;
  const normalized = decodeEntities(value).replace(controlChars, '');

  const scheme = SCHEME.exec(normalized);
  // No scheme at all means a relative path or a fragment — nothing to abuse.
  if (!scheme) return false;

  return !SAFE_SCHEMES.has(scheme[1].toLowerCase());
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
 * Allowlist HTML sanitizer. For each tag it keeps only allowlisted tags and
 * rebuilds them from an attribute allowlist — dropping every event handler and
 * inline style regardless of how the attribute is separated — and rewrites any
 * href/src whose scheme is outside `SAFE_SCHEMES` to `#`. Rebuilding (rather
 * than stripping) avoids the attribute-separator bypasses that strip-based
 * regex sanitizers miss.
 *
 * Untrusted free-form input should still go through escapeHtml rather than be
 * rendered as markup; this function is for already-structured markup such as
 * Tiptap-generated HTML.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Drop script/style/iframe/object/embed blocks along with their content.
  let clean = html.replace(
    /<(script|style|iframe|object|embed|noscript)\b[\s\S]*?<\/\1\s*>/gim,
    ''
  );

  clean = clean.replace(/<[^>]*>/g, (tag) => {
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
      if (
        (attrName === 'href' || attrName === 'src') &&
        isUnsafeUrl(value)
      ) {
        value = '#';
      }
      attrs.push(`${attrName}="${value.replace(/"/g, '&quot;')}"`);
    }

    const rendered = attrs.length ? `<${name} ${attrs.join(' ')}` : `<${name}`;
    return VOID_TAGS.has(name) ? `${rendered} />` : `${rendered}>`;
  });

  return clean.trim();
}
