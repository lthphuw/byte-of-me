'use client';

import { useEffect, useRef, useState } from 'react';
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  getSharedNoteById,
  noteShareKeys,
  updateSharedNote,
} from '@/entities/note-share';
import { Link } from '@/shared/i18n/navigation';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { SharedNoteBreadcrumb } from '@/widgets/shared/shared-note-workspace/ui/shared-note-breadcrumb';
import { SharedNoteTree } from '@/widgets/shared/shared-note-workspace/ui/shared-note-tree';

/** Matches the owner editor's debounce; see `use-note-editor-autosave`. */
const AUTOSAVE_DELAY_MS = 800;

/**
 * One shared note, with the tree of its share root beside it.
 *
 * Mounted from `notes/layout.tsx`, NOT from the page — a layout survives a
 * change of child segment and a page does not. Mounting it in the page meant
 * every click on a sibling note tore down the tree, the breadcrumb and the
 * document together and refetched each level, which reads as the whole screen
 * reloading to move between two notes in the same shared folder.
 */
export function SharedNoteWorkspace() {
  const t = useTranslations('share.note');
  // The segment directly below the layout that mounts this. Reading it here
  // rather than taking a prop is what lets the layout stay mounted across a
  // note switch — see `notes/layout.tsx`.
  const noteId = useSelectedLayoutSegment();

  const note = useQuery({
    queryKey: noteShareKeys.detail(noteId ?? ''),
    queryFn: async () => {
      const res = await getSharedNoteById(noteId ?? '');
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: noteId !== null,
    // The editor writes through this same key, so a refetch around a
    // debounced save is exactly the loop `use-note-editor-autosave` documents
    // at length. Nothing else changes this note under the recipient.
    refetchOnWindowFocus: false,
  });

  // `/shared/notes` with no id below it. The layout renders on that URL too,
  // and without this the query would fire for an empty id and report the
  // note as missing.
  if (noteId === null) {
    return null;
  }

  if (note.isPending) {
    return (
      <main className="container mx-auto flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </main>
    );
  }

  // One message for "no such note" and "not shared with you" alike — the
  // action refuses to distinguish them, and the UI must not undo that by
  // rendering a different shape for each.
  if (note.isError) {
    return (
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
        <Link href="/shared" className="text-sm underline underline-offset-4">
          {t('backToInbox')}
        </Link>
      </main>
    );
  }

  const data = note.data;
  // A tree only earns its space when the share root is a folder; a single
  // shared note has nothing to browse.
  const showTree = data.rootId !== data.id || data.isFolder;

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-4 py-6 md:flex-row md:gap-8">
      {showTree ? (
        <aside className="flex w-full shrink-0 flex-col gap-2 md:w-64">
          {/* Names what was actually shared. The breadcrumb stops at the root
              and says nothing about what is above it — correct, but it left
              the recipient with a path and no idea where it began. */}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate font-medium">{data.rootTitle}</span>
          </p>

          <SharedNoteTree parentId={data.rootId} activeId={data.id} />
        </aside>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-col gap-2">
          {/* Always rendered, never inside the tree block. A single-note share
              draws no tree, and with the only link to the inbox nested in it a
              recipient landing straight from an invitation had no way out of
              the page at all. */}
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

        {data.isFolder ? (
          <p className="text-sm text-muted-foreground">{t('selectNote')}</p>
        ) : data.role === 'EDITOR' ? (
          <SharedNoteEditor noteId={data.id} initialContent={data.content} />
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
 * The editor half, with the same debounced autosave shape the owner's editor
 * uses.
 *
 * `initialContent` is read ONCE, into the uncontrolled editor: feeding the
 * query's value back in on every render would fight the user's cursor, which
 * is the failure `use-note-editor-autosave` describes.
 */
function SharedNoteEditor({
  noteId,
  initialContent,
}: {
  noteId: string;
  initialContent: string;
}) {
  const t = useTranslations('share.note');
  const [pending, setPending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: async (content: string) => {
      const res = await updateSharedNote({ id: noteId, content });
      if (!res.success) throw new Error(res.errorMsg);
    },
  });

  // Flush on unmount so navigating away mid-debounce does not silently drop
  // the last edit.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scheduleSave = (content: string) => {
    setPending(content);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save.mutate(content);
      setPending(null);
    }, AUTOSAVE_DELAY_MS);
  };

  const status = save.isError
    ? t('saveFailed')
    : save.isPending || pending !== null
      ? t('saving')
      : save.isSuccess
        ? t('saved')
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 text-xs text-muted-foreground">
        {status ? (
          <span className={save.isError ? 'text-destructive' : undefined}>
            {status}
          </span>
        ) : null}
      </div>

      {/* `chromeless`: the same toolbar-free writing surface the owner's notes
          workspace uses. Formatting is not lost with it — StarterKit's input
          rules still turn `## `, `**bold**` and friends into real nodes. */}
      <LazyRichTextEditor
        value={JSON.parse(initialContent)}
        onChange={(value) => scheduleSave(JSON.stringify(value))}
        chromeless
        compact
      />
    </div>
  );
}
