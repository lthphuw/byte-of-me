/**
 * Scrolls the writing surface to where an attachment is referenced, and marks
 * it briefly so the eye can find it.
 *
 * The panel's rows are a table of contents for the note's files, so clicking
 * one goes to the place in the text — the same gesture, and the same answer,
 * as clicking a heading in the Contents tab. Reading the file itself is the
 * row menu's job.
 *
 * Returns false when the file is not referenced anywhere in the document,
 * which is the ordinary case for one attached through the panel's own button:
 * there is no place to go, so the caller opens the reader instead.
 */
export function revealAttachmentInDocument(href: string): boolean {
  const anchor = document.querySelector<HTMLElement>(
    `.ProseMirror a[href="${CSS.escape(href)}"]`
  );

  if (!anchor) return false;

  anchor.scrollIntoView({
    // `block: 'center'` rather than the default `start`: the editor's toolbar
    // sits above the scrolling area, so a link scrolled to the very top lands
    // underneath it.
    block: 'center',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });

  // A class rather than inline styles, so the highlight is themed with
  // everything else. Removed on a timer because there is no event that means
  // "the author has seen it".
  anchor.classList.add('note-attachment-flash');
  window.setTimeout(() => anchor.classList.remove('note-attachment-flash'), 1600);

  return true;
}
