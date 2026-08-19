/**
 * Strip a pasted document's PRESENTATION before ProseMirror parses it, keeping
 * its structure and semantics.
 *
 * Tiptap keeps whatever an extension claims, and this editor registers
 * `TextStyle` (matches ANY `<span style>`) + `Color` (reads
 * `element.style.color` off it), so one `<span style="color:#0000ee">` in a
 * pasted table becomes a real `textStyle` mark and the source's palette
 * outlives the paste — invisible on a dark note when it was picked against
 * white. `Highlight` takes a `<mark>`'s `background-color` the same way, cells
 * read `<colgroup>` widths and `align`, and `Link` keeps the source's `class`.
 *
 * Before the parse, not after: once a mark is in the document it is
 * indistinguishable from one the author applied on purpose.
 */

/** Attributes that only ever say how the source document looked. */
const PRESENTATION_ATTRIBUTES = [
  'style',
  'color',
  'bgcolor',
  'background',
  'face',
  'align',
  'valign',
  'border',
  'cellpadding',
  'cellspacing',
];

/**
 * Layout sizing from the source. Kept on `<img>` alone, where width/height are
 * the asset's own dimensions rather than a column the author never chose.
 */
const SIZING_ATTRIBUTES = ['width', 'height'];

/** Removed with their contents: none of them is content. */
const DROPPED_ELEMENTS = 'style, script, link, meta, colgroup';

/** `language-ts` / `lang-ts` — the one class that carries meaning, not looks. */
const LANGUAGE_CLASS = /^(?:language|lang)-/;

const NEUTRAL_WEIGHT = /font-weight\s*:\s*(?:normal|400)\b/i;
const NEUTRAL_STYLE = /font-style\s*:\s*normal\b/i;

/** Replace an element with its children, keeping the text and dropping the box. */
function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

/**
 * A wrapper that exists only to carry presentation: `<font>`, and Google Docs'
 * `<b style="font-weight:normal">` around the whole fragment — which would turn
 * an entire pasted document BOLD once the style is stripped, since the tag
 * alone is what ProseMirror parses.
 */
function isPresentationWrapper(tag: string, style: string): boolean {
  if (tag === 'font') return true;
  if (tag === 'b' || tag === 'strong') return NEUTRAL_WEIGHT.test(style);
  if (tag === 'i' || tag === 'em') return NEUTRAL_STYLE.test(style);
  return false;
}

export function stripPastedPresentation(html: string): string {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return html;

  // ProseMirror stamps its own clipboard HTML with `data-pm-slice`. That
  // fragment IS this document's format, so a copy-paste within a note has to
  // keep the colours and highlights the author applied by hand.
  if (body.querySelector('[data-pm-slice]')) return html;

  for (const element of Array.from(body.querySelectorAll(DROPPED_ELEMENTS))) {
    element.remove();
  }

  const wrappers: Element[] = [];

  for (const element of Array.from(body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase();
    // Read before stripping — the decision below is made ON the inline style.
    const style = element.getAttribute('style') ?? '';
    if (isPresentationWrapper(tag, style)) wrappers.push(element);

    for (const name of PRESENTATION_ATTRIBUTES) element.removeAttribute(name);
    if (tag !== 'img') {
      for (const name of SIZING_ATTRIBUTES) element.removeAttribute(name);
    }

    const kept = (element.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter((name) => LANGUAGE_CLASS.test(name));
    if (kept.length > 0) {
      element.setAttribute('class', kept.join(' '));
    } else {
      element.removeAttribute('class');
    }
  }

  // After the attribute pass: unwrapping first would drop elements out of the
  // list being walked.
  for (const element of wrappers) unwrap(element);

  return body.innerHTML;
}
