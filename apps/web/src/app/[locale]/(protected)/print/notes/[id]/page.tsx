// Subpath imports, not the package barrel: both of these are leaves, and the
// barrel would pull the whole UI package onto a page that renders one note.
import { MathRenderer } from '@byte-of-me/ui/math-renderer';
import { RichText } from '@byte-of-me/ui/rich-text';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAdminNoteById, getNoteTitle } from '@/entities/note';
import { NotePrintTrigger } from '@/features/notes/note-editor';

const BASE_METADATA: Metadata = {
  description: 'Private notes. Never published.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * The title becomes the PDF's default filename in Chrome's save dialog, so
 * it is worth getting right — "Notes" for every export would be useless.
 *
 * Through `getNoteTitle`, exactly as `space/notes/[id]/page.tsx` does: the
 * page below already reads the whole document, and `getAdminNoteById` here
 * fetched a second copy of `content` to look at one field of it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getNoteTitle(id);
    if (res.success && res.data.trim()) {
      return { ...BASE_METADATA, title: res.data };
    }
  } catch {
    // `requireAdmin` can throw during a metadata pass; the page below is
    // still guarded, only the label degrades.
  }
  return { ...BASE_METADATA, title: 'Note' };
}

/**
 * The printable note.
 *
 * Rendered with `RichText` — the SERVER component — not the editor. It goes
 * through `render-extensions.ts`, so KaTeX markup, tables and images all come
 * out as static HTML and no editor JavaScript reaches the page at all. That
 * is what makes the resulting PDF text-true rather than a screenshot: Chrome
 * is laying out real glyphs from real fonts.
 */
export default async function NotePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, { print }] = await Promise.all([params, searchParams]);
  const res = await getAdminNoteById(id);

  // No distinction between "unknown id" and "not yours" — both are 404, the
  // same discipline the rest of the notes surface follows.
  if (!res.success) notFound();

  const note = res.data;

  return (
    // A plain wrapper, NOT a `prose` container: `RichText` renders its own
    // `<article class="prose …">`, and nesting one inside another made the
    // typography variables resolve twice with the outer copy winning for
    // some elements and the inner for others.
    <div>
      <h1 className="mb-1 text-3xl font-bold">{note.title}</h1>
      <p className="mb-8 mt-0 text-xs text-muted-foreground">
        {note.updatedAt.toISOString().slice(0, 10)}
      </p>

      <RichText content={note.content} />

      {/* Before the print trigger below, deliberately: it renders the maths
          (and so requests the KaTeX fonts) that the trigger's
          `document.fonts.ready` wait then has something to wait for. */}
      <MathRenderer />

      {/* Only the export menu's `?print=1` opens the dialog by itself; a
          bare visit to this URL renders a readable page with a button. */}
      <NotePrintTrigger auto={print === '1'} />
    </div>
  );
}
