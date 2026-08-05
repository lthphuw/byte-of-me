import { NoteTreeSkeleton } from '@/entities/note';

/**
 * Mirrors `NoteManager`'s two-pane frame: tree column on `md+`, empty editor
 * pane beside it. Below `md` the tree column is the whole screen, exactly like
 * the list route it stands in for.
 */
export default function NotesLoading() {
  return (
    <div className="flex min-h-0 flex-1" aria-hidden>
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-r bg-background md:w-64">
        <NoteTreeSkeleton />
      </aside>
      <main className="hidden min-h-0 min-w-0 flex-1 bg-background md:block" />
    </div>
  );
}
