// Subpath imports, not the package barrel: both of these are leaves, and the
// barrel would pull the whole UI package — TipTap included — onto a page that
// renders one document.
import type { ReactNode } from 'react';
import { MathRenderer } from '@byte-of-me/ui/math-renderer';
import { RichText } from '@byte-of-me/ui/rich-text';

/**
 * The page Chrome turns into a PDF — shared by `/print/blogs/[slug]` and
 * `/print/notes/[id]`, which differ only in where the document comes from.
 *
 * Rendered with `RichText` — the SERVER component — not the editor. It goes
 * through `render-extensions.ts`, so KaTeX markup, tables and images all come
 * out as static HTML and no editor JavaScript reaches the page at all. That
 * is what makes the resulting PDF text-true rather than a screenshot: Chrome
 * is laying out real glyphs from real fonts, and the `@media print` rules in
 * `globals.css` ARE the page layout.
 *
 * `MermaidBlocks` is deliberately absent even though the on-site article
 * renders inside it: it swaps code blocks for drawn SVGs after hydration,
 * which nothing here can wait for — `?print=1` fires on `document.fonts.ready`
 * and would race it. A mermaid block exports as its source, which is at least
 * deterministic.
 */
export function PrintableDocument({
  title,
  byline,
  content,
  children,
}: {
  title: string;
  /** The small line under the title: authors, dates, whatever the route has. */
  byline?: ReactNode;
  /** A stored rich text value — Tiptap JSON, as the database holds it. */
  content?: string | null;
  /** The route's print trigger. Rendered last, deliberately — see below. */
  children?: ReactNode;
}) {
  return (
    // A plain wrapper, NOT a `prose` container: `RichText` renders its own
    // `<article class="prose …">`, and nesting one inside another made the
    // typography variables resolve twice with the outer copy winning for some
    // elements and the inner for others.
    <div>
      <h1 className="mb-1 text-3xl font-bold">{title}</h1>

      {byline && (
        <p className="mb-8 mt-0 text-xs text-muted-foreground">{byline}</p>
      )}

      <RichText content={content ?? undefined} />

      {/* Before the print trigger below, deliberately: it renders the maths
          (and so requests the KaTeX fonts) that the trigger's
          `document.fonts.ready` wait then has something to wait for. */}
      <MathRenderer />

      {/* Only `?print=1` opens the dialog by itself; a bare visit to one of
          these URLs renders a readable page with a button. */}
      {children}
    </div>
  );
}
