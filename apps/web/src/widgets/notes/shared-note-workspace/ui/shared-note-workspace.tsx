'use client';

import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, Folder } from 'lucide-react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { getSharedNoteById, noteShareKeys } from '@/entities/note-share';
import { Link } from '@/shared/i18n/navigation';
import { SharedNoteBreadcrumb } from '@/widgets/notes/shared-note-workspace/ui/shared-note-breadcrumb';
import { SharedNoteEditor } from '@/widgets/notes/shared-note-workspace/ui/shared-note-editor';
import { SharedNoteDocumentSkeleton } from '@/widgets/notes/shared-note-workspace/ui/shared-note-skeleton';
import { SharedNoteTree } from '@/widgets/notes/shared-note-workspace/ui/shared-note-tree';

/**
 * One shared note, with the tree of its share root beside it.
 *
 * Mounted from `notes/layout.tsx`, NOT from the page — a layout survives a
 * change of child segment and a page does not.
 *
 * That alone was not enough. The query key carries the note id, so opening a
 * sibling put the whole component back into `isPending`; the early return for
 * that state unmounted the rail along with the document, and the tree came
 * back with every folder collapsed and every level refetched. `keepPreviousData`
 * is the other half of the fix: the shell keeps rendering the note it already
 * has while the next one loads, so only the reading column changes.
 */
export function SharedNoteWorkspace() {
  const t = useTranslations('share.note');
  // The segment directly below the layout that mounts this — reading it here
  // rather than as a prop is what lets that layout stay mounted.
  const noteId = useSelectedLayoutSegment();

  const note = useQuery({
    queryKey: noteShareKeys.detail(noteId ?? ''),
    queryFn: async () => {
      const res = await getSharedNoteById(noteId ?? '');
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: noteId !== null,
    // Keeps the rail and the masthead on screen across a note switch. Without
    // it every click emptied the page and rebuilt it.
    placeholderData: keepPreviousData,
    // The editor writes through this same key, so a refetch around a debounced
    // save is the loop `use-note-editor-autosave` documents at length.
    refetchOnWindowFocus: false,
  });

  const data = note.data;
  // True while the NEXT note is in flight and the previous one is still drawn.
  const isSwitching = note.isPlaceholderData && note.isFetching;

  // `/shared/notes` with no id below it: the layout renders there too.
  if (noteId === null) {
    return null;
  }

  // Only before anything at all has loaded. Every later navigation keeps the
  // shell and swaps the column inside it.
  if (!data && note.isPending) {
    return (
      <div className="container mx-auto w-full py-8">
        <SharedNoteDocumentSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        {/* One message for "no such note" and "not shared with you" alike —
            the action refuses to distinguish them, and the UI must not undo
            that by rendering a different shape for each. */}
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
        <Link href="/shared" className="text-sm underline underline-offset-4">
          {t('backToInbox')}
        </Link>
      </main>
    );
  }

  // A rail only earns its space when the share root is a folder; a single
  // shared note has nothing to browse.
  const showTree = data.rootId !== data.id || data.rootIsFolder;

  return (
    <div className="container mx-auto flex w-full flex-col gap-6 py-6 md:flex-row md:items-start md:gap-10">
      {showTree ? (
        /* `sticky` with its own scroller: the document is long and the rail is
           short, so scrolling the reading column used to carry the rail off
           the top of the window with it. `top-6` matches the container's
           padding so it parks where it started. */
        <aside className="flex w-full shrink-0 flex-col gap-3 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:w-64">
          <SharedRootMasthead
            title={data.rootTitle}
            isFolder={data.rootIsFolder}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SharedNoteTree parentId={data.rootId} activeId={data.id} />
          </div>
        </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-col gap-2">
          {/* Always rendered, never inside the rail: a single-note share draws
              no rail, and with the only way back nested in it a recipient
              arriving from an invitation had no way off the page. */}
          <Link
            href="/shared"
            className="w-fit text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t('backToInbox')}
          </Link>

          <SharedNoteBreadcrumb noteId={data.id} />

          <h1 className="text-2xl font-semibold tracking-tight">
            {data.title}
          </h1>

          {data.role === 'VIEWER' ? (
            <p className="text-xs text-muted-foreground">{t('readOnly')}</p>
          ) : null}
        </header>

        {/* The editor is checked FIRST, ahead of `isSwitching`, and mounted
            with no `key` — both deliberate. It used to be keyed on the note
            id and replaced by the skeleton on every rail click, which meant a
            fresh Tiptap instance and an empty undo stack each time. It now
            survives the switch and reseeds itself from these props (see
            `SharedNoteEditor`), so the whole surface shows the note being
            LEFT — title, breadcrumb, rail and body together — until the next
            one arrives, instead of blanking the one column that could still
            be read. Anything typed in that window still belongs to
            `data.id`, and is still flushed under it. */}
        {data.role === 'EDITOR' && !data.isFolder ? (
          <SharedNoteEditor
            noteId={data.id}
            initialContent={data.content}
            initialUpdatedAt={data.updatedAt}
          />
        ) : isSwitching ? (
          <SharedNoteDocumentSkeleton />
        ) : data.isFolder ? (
          <p className="text-sm text-muted-foreground">{t('selectNote')}</p>
        ) : (
          // `html` is rendered on the server with unreachable note links
          // already dropped — see `SharedNoteDetail.html` for why the viewer
          // never renders the document itself.
          <RichTextHtml html={data.html ?? undefined} />
        )}
      </main>
    </div>
  );
}

/**
 * What was shared, named at the top of the rail.
 *
 * The breadcrumb deliberately stops at the share root and says nothing about
 * what is above it, which left the reader holding a path with no beginning.
 * This is the one element this surface has that nothing else in the app does,
 * so it is the one place worth being emphatic.
 */
function SharedRootMasthead({
  title,
  isFolder,
}: {
  title: string;
  isFolder: boolean;
}) {
  const t = useTranslations('share.note');
  const Icon = isFolder ? Folder : FileText;

  return (
    <div className="flex flex-col gap-1 border-b pb-3">
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {t('sharedWithYouLabel')}
      </span>
      <span className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-semibold">{title}</span>
      </span>
    </div>
  );
}
