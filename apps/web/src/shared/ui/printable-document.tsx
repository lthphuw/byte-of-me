// Subpath imports: `@byte-of-me/rich-text-render` has no root entry, and these
// two leaves keep the editor out of a page that renders one document.
import type { ReactNode } from 'react';
import { MathRenderer } from '@byte-of-me/rich-text-render/math-renderer';
import { RichText } from '@byte-of-me/rich-text-render/rich-text';

/**
 * The page Chrome prints to PDF (`/print/blogs/[slug]`). Server `RichText`, no editor JS:
 * real text, and `@media print` in `globals.css` is the layout. No `MermaidBlocks`, whose
 * post-hydration SVG swap would race `?print=1`; mermaid exports as its source.
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
    // A plain wrapper, not `prose`: `RichText` renders its own `<article class="prose">`,
    // and nesting two made the typography variables resolve twice, split by element.
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
