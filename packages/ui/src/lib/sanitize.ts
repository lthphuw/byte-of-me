// Tags allowed to survive sanitization. Everything else is dropped (its text
// content is kept but rendered inert).
const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 's', 'u', 'mark', 'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code',
  'pre', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr',
  'th', 'td',
]);

// Attributes allowed on surviving tags. Notably excludes all `on*` event
// handlers and `style`. Anything not listed is dropped.
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'colspan',
  'rowspan', 'start', 'type', 'width', 'height',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);
const DANGEROUS_URL = /^\s*(?:javascript|data|vbscript):/i;

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
 * inline style regardless of how the attribute is separated — and neutralizes
 * javascript:/data:/vbscript: URLs. Rebuilding (rather than stripping) avoids
 * the attribute-separator bypasses that strip-based regex sanitizers miss.
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
        DANGEROUS_URL.test(value)
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
