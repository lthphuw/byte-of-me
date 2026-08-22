import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAdminNoteById, getNoteTitle } from '@/entities/note';
import { NotePrintTrigger } from '@/features/notes/note-editor';
// Deep path, not the barrel: it would pull the whole shared-ui surface onto a
// page that renders one note.
import { PrintableDocument } from '@/shared/ui/printable-document';

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
 * The printable note. `PrintableDocument` is the page itself — this route only
 * resolves which note, and guards that it is the owner asking.
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
    <PrintableDocument
      title={note.title}
      byline={note.updatedAt.toISOString().slice(0, 10)}
      content={note.content}
    >
      <NotePrintTrigger auto={print === '1'} />
    </PrintableDocument>
  );
}
