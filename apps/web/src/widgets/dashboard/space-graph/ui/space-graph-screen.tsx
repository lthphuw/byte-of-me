'use client';

import { useTranslations } from 'next-intl';

import { NoteGraph } from '@/features/dashboard/note-graph';
import { useRouter } from '@/shared/i18n/navigation';
import { NOTES_BASE_PATH } from '@/widgets/dashboard/note-manager';
import { SpaceNavTrigger } from '@/widgets/dashboard/space-shell';

/**
 * The full-screen graph screen.
 *
 * A widget rather than the page itself because opening a node is a route
 * push, and the feature below must not know what a note's URL looks like —
 * the same split `NoteManager` makes with `NOTES_BASE_PATH`. Composing two
 * widgets (`SpaceNavTrigger` here) is legal at this layer in a way it is not
 * inside `NoteManager`, which is why that one takes its trigger as a slot.
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
        <NoteGraph onOpen={(id) => router.push(`${NOTES_BASE_PATH}/${id}`)} />
      </div>
    </div>
  );
}
