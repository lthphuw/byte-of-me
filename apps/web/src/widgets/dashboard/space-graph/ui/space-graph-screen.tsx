'use client';

import { useTranslations } from 'next-intl';

import { noteHref } from '@/entities/note';
import { NoteGraph } from '@/features/dashboard/note-graph';
import { useRouter } from '@/shared/i18n/navigation';
import { SpaceNavTrigger } from '@/widgets/dashboard/space-shell';

/**
 * The full-screen graph screen.
 *
 * A widget rather than the page itself because opening a node is a route
 * push, and the feature below must not know what a note's URL looks like —
 * the same split `NoteManager` makes with `NOTES_BASE_PATH`. Composing two
 * widgets (`SpaceNavTrigger` here) is legal at this layer in a way it is not
 * inside `NoteManager`, which is why that one takes its trigger as a slot.
 *
 * The href comes from `noteHref` in the ENTITY, not from `NOTES_BASE_PATH` in
 * `note-manager`. Both build the same string; reaching for the widget's was a
 * sideways import into another slice's internals, through a barrel that is
 * `export * from './ui'` and therefore names `NoteEditor`,
 * `NoteSearchPalette`, `NotePropertiesPanel` and the whole `note-explorer`
 * feature — none of which this route renders.
 *
 * NOT a bundle fix, and it is worth saying so rather than leaving the next
 * reader to assume it was. Measured on the built app by diffing
 * `page_client-reference-manifest.js` for this route across the change:
 * `note-manager` appeared 0 times BEFORE and 0 times after (the same probe
 * finds it 8 times on `/space/notes`, so the manifest does carry these paths).
 * Turbopack had already dropped the unreached modules — AGENTS §7's measured
 * position. What the import actually cost was layering and a second place
 * where a note's URL is spelled out; `notes/layout.tsx`'s d3 note describes a
 * real bundle effect in the other direction, and this is not its twin.
 */
export function SpaceGraphScreen() {
  const t = useTranslations('dashboard.note.graph');
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <SpaceNavTrigger className="md:hidden" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{t('title')}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {t('description')}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <NoteGraph onOpen={(id) => router.push(noteHref(id))} />
      </div>
    </div>
  );
}
